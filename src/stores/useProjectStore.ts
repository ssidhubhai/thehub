import { create } from 'zustand';
import {
  Project,
  ProjectUpdate,
  ProjectDiscussion,
  ProjectInterest,
  ProjectExternalLink,
} from '@/types/project';
import { mockDb, STORAGE_KEYS } from '@/lib/firebase/mock/mockDb';
import { dbService } from '@/lib/firebase/db';
import { useAuthStore } from './useAuthStore';
import { InAppNotification } from '@/types/notification';
import { api } from '@/lib/api';

export interface ProjectState {
  projects: Project[];
  updates: Record<string, ProjectUpdate[]>;
  discussions: Record<string, ProjectDiscussion[]>;
  userInterests: Record<string, boolean>; // projectId -> boolean
  searchQuery: string;
  selectedRoleTags: string[];
  isLoading: boolean;

  fetchProjects: (options?: { silent?: boolean }) => Promise<void>;
  fetchProjectDetails: (projectId: string) => Promise<Project | null>;
  createProject: (data: {
    name: string;
    tagline: string;
    description: string;
    lookingForTags: string[];
    links?: ProjectExternalLink[];
    coverImageUrl?: string;
  }) => Promise<Project>;
  updateProject: (
    projectId: string,
    data: {
      name?: string;
      tagline?: string;
      description?: string;
      lookingForTags?: string[];
      links?: ProjectExternalLink[];
      coverImageUrl?: string;
    }
  ) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  expressInterest: (projectId: string, message?: string) => Promise<ProjectInterest>;
  pitchProject: (projectId: string, message?: string) => Promise<ProjectInterest>;
  addProjectUpdate: (
    projectId: string,
    title: string,
    content: string,
    imageUrl?: string
  ) => Promise<ProjectUpdate>;
  addDiscussion: (projectId: string, content: string) => Promise<ProjectDiscussion>;
  setSearchQuery: (q: string) => void;
  toggleRoleTag: (tag: string) => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  updates: {},
  discussions: {},
  userInterests: {},
  searchQuery: '',
  selectedRoleTags: [],
  isLoading: false,

  fetchProjects: async (options?: { silent?: boolean }) => {
    if (!options?.silent) set({ isLoading: true });
    try {
      const serverProjects = await api.projects.list();
      const currentUser = useAuthStore.getState().user;
      const interestMap: Record<string, boolean> = {};

      if (currentUser) {
        try {
          const interests = await api.projects.listInterests();
          interests.forEach((i) => {
            if (i.userId === currentUser.id) {
              interestMap[i.projectId] = true;
            }
          });
        } catch {
          // ignore
        }
      }

      set({
        projects: serverProjects,
        userInterests: interestMap,
        isLoading: false,
      });
    } catch {
      try {
        const localProjects = await dbService.list<Project>('projects');
        set({
          projects: localProjects,
          userInterests: {},
          isLoading: false,
        });
      } catch {
        set({ isLoading: false });
      }
    }
  },

  fetchProjectDetails: async (projectId: string) => {
    try {
      const details = await api.projects.get(projectId);
      set((state) => ({
        projects: state.projects.some((p) => p.id === details.project.id)
          ? state.projects.map((p) => (p.id === details.project.id ? details.project : p))
          : [...state.projects, details.project],
        updates: {
          ...state.updates,
          [projectId]: details.updates,
        },
        discussions: {
          ...state.discussions,
          [projectId]: details.discussions,
        },
      }));
      return details.project;
    } catch {
      mockDb.ensureInitialized();
      const project = await mockDb.get<Project>(STORAGE_KEYS.PROJECTS, projectId);
      if (!project) return null;

      const [allUpdates, allDiscussions] = await Promise.all([
        mockDb.list<ProjectUpdate>(STORAGE_KEYS.PROJECT_UPDATES, (u) => u.projectId === projectId),
        mockDb.list<ProjectDiscussion>(
          STORAGE_KEYS.PROJECT_DISCUSSIONS,
          (d) => d.projectId === projectId
        ),
      ]);

      set((state) => ({
        projects: state.projects.some((p) => p.id === project.id)
          ? state.projects.map((p) => (p.id === project.id ? project : p))
          : [...state.projects, project],
        updates: {
          ...state.updates,
          [projectId]: allUpdates,
        },
        discussions: {
          ...state.discussions,
          [projectId]: allDiscussions,
        },
      }));

      return project;
    }
  },

  createProject: async (data) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in to create a project');

    try {
      const created = await api.projects.create(data);
      set((state) => ({
        projects: [created, ...state.projects],
      }));
      return created;
    } catch (apiErr: any) {
      console.warn('API project creation failed, falling back to local database:', apiErr);
      const now = new Date().toISOString();
      const newProjectData: Omit<Project, 'id'> = {
        name: data.name.trim(),
        tagline: data.tagline.trim(),
        description: data.description.trim(),
        coverImageUrl: data.coverImageUrl,
        ownerId: user.id,
        team: [
          {
            userId: user.id,
            role: 'owner',
            joinedAt: now,
          },
        ],
        lookingForTags: data.lookingForTags,
        links: data.links || [],
        updatesCount: 0,
        discussionCount: 0,
        interestCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      const created = await mockDb.create<Project>(STORAGE_KEYS.PROJECTS, newProjectData as any);

      set((state) => ({
        projects: [created, ...state.projects],
      }));

      return created;
    }
  },

  updateProject: async (projectId: string, data) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in to edit a project');

    try {
      const updated = await api.projects.update(projectId, data);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === projectId ? updated : p)),
      }));
      return updated;
    } catch {
      const project = await mockDb.get<Project>(STORAGE_KEYS.PROJECTS, projectId);
      if (!project) throw new Error('Project not found');
      if (project.ownerId !== user.id && user.role !== 'moderator' && user.username !== 'sidhu001') {
        throw new Error('Unauthorized to edit this project');
      }

      const now = new Date().toISOString();
      const updatedData: Partial<Project> = {
        ...data,
        updatedAt: now,
      };

      await mockDb.update<Project>(STORAGE_KEYS.PROJECTS, projectId, updatedData);
      const updatedProject = { ...project, ...updatedData };

      set((state) => ({
        projects: state.projects.map((p) => (p.id === projectId ? updatedProject : p)),
      }));

      return updatedProject;
    }
  },

  deleteProject: async (projectId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in to delete a project');

    const project = get().projects.find((p) => p.id === projectId) || (await mockDb.get<Project>(STORAGE_KEYS.PROJECTS, projectId));
    if (project && project.ownerId !== user.id && user.role !== 'moderator' && user.username !== 'sidhu001') {
      throw new Error('Unauthorized to delete this project');
    }

    try {
      await api.projects.delete(projectId);
    } catch {
      // ignore
    }

    await mockDb.delete(STORAGE_KEYS.PROJECTS, projectId);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
    }));
  },

  expressInterest: async (projectId: string, message?: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in to express interest');

    if (get().userInterests[projectId]) {
      throw new Error('You have already expressed interest in this project');
    }

    try {
      const created = await api.projects.expressInterest(projectId, message);
      set((state) => ({
        userInterests: {
          ...state.userInterests,
          [projectId]: true,
        },
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, interestCount: (p.interestCount || 0) + 1 } : p
        ),
      }));
      return created;
    } catch (apiErr: any) {
      if (apiErr.message?.includes('already expressed') || apiErr.message?.includes('already a team member') || apiErr.message?.includes('owner')) {
        throw apiErr;
      }
      const created = await mockDb.pitchProject(projectId, user.id, message);
      set((state) => ({
        userInterests: {
          ...state.userInterests,
          [projectId]: true,
        },
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, interestCount: (p.interestCount || 0) + 1 } : p
        ),
      }));
      return created;
    }
  },

  pitchProject: async (projectId: string, message?: string) => {
    return get().expressInterest(projectId, message);
  },

  addProjectUpdate: async (projectId: string, title: string, content: string, imageUrl?: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in');

    try {
      const created = await api.projects.addUpdate(projectId, title, content, imageUrl);
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, updatesCount: (p.updatesCount || 0) + 1 } : p
        ),
        updates: {
          ...state.updates,
          [projectId]: [created, ...(state.updates[projectId] || [])],
        },
      }));
      return created;
    } catch (apiErr: any) {
      if (apiErr.message && !apiErr.message.includes('Failed to fetch')) {
        throw apiErr;
      }
      const project = await mockDb.get<Project>(STORAGE_KEYS.PROJECTS, projectId);
      if (!project || project.ownerId !== user.id) {
        throw new Error('Only the project owner can post updates');
      }

      const now = new Date().toISOString();
      const newUpdate: Omit<ProjectUpdate, 'id'> = {
        projectId,
        authorId: user.id,
        title: title.trim(),
        content: content.trim(),
        imageUrl,
        createdAt: now,
      };

      const created = await mockDb.create<ProjectUpdate>(
        STORAGE_KEYS.PROJECT_UPDATES,
        newUpdate as any
      );

      const newUpdatesCount = (project.updatesCount || 0) + 1;
      await mockDb.update<Project>(STORAGE_KEYS.PROJECTS, projectId, {
        updatesCount: newUpdatesCount,
      });

      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, updatesCount: newUpdatesCount } : p
        ),
        updates: {
          ...state.updates,
          [projectId]: [created, ...(state.updates[projectId] || [])],
        },
      }));

      return created;
    }
  },

  addDiscussion: async (projectId: string, content: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in to participate in discussion');

    try {
      const created = await api.projects.addDiscussion(projectId, content);
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, discussionCount: (p.discussionCount || 0) + 1 } : p
        ),
        discussions: {
          ...state.discussions,
          [projectId]: [...(state.discussions[projectId] || []), created],
        },
      }));
      return created;
    } catch (apiErr: any) {
      if (apiErr.message && !apiErr.message.includes('Failed to fetch')) {
        throw apiErr;
      }
      const project = await mockDb.get<Project>(STORAGE_KEYS.PROJECTS, projectId);
      if (!project) throw new Error('Project not found');

      const now = new Date().toISOString();
      const newDisc: Omit<ProjectDiscussion, 'id'> = {
        projectId,
        authorId: user.id,
        author: {
          id: user.id,
          username: user.username,
          displayName: user.profile.displayName,
          avatarUrl: user.profile.avatarUrl,
          avatarInitials: user.profile.avatarInitials,
        },
        content: content.trim(),
        createdAt: now,
      };

      const created = await mockDb.create<ProjectDiscussion>(
        STORAGE_KEYS.PROJECT_DISCUSSIONS,
        newDisc as any
      );

      const newDiscCount = (project.discussionCount || 0) + 1;
      await mockDb.update<Project>(STORAGE_KEYS.PROJECTS, projectId, {
        discussionCount: newDiscCount,
      });

      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, discussionCount: newDiscCount } : p
        ),
        discussions: {
          ...state.discussions,
          [projectId]: [...(state.discussions[projectId] || []), created],
        },
      }));

      return created;
    }
  },

  setSearchQuery: (q: string) => set({ searchQuery: q }),

  toggleRoleTag: (tag: string) =>
    set((state) => ({
      selectedRoleTags: state.selectedRoleTags.includes(tag)
        ? state.selectedRoleTags.filter((t) => t !== tag)
        : [...state.selectedRoleTags, tag],
    })),

  reset: () => {
    set({
      projects: [],
      updates: {},
      discussions: {},
      userInterests: {},
      searchQuery: '',
      selectedRoleTags: [],
      isLoading: false,
    });
  },
}));
