import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { serverDb, hashPassword } from './server/db';
import { User, UserProfile } from './src/types/user';
import { Post, Comment, PostAttachment } from './src/types/post';
import { Project, ProjectUpdate, ProjectDiscussion, ProjectInterest } from './src/types/project';
import { Conversation, Message } from './src/types/message';
import { InAppNotification } from './src/types/notification';
import { Connection } from './src/types/common';
import { getInitials } from './src/lib/utils';

interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

// Authentication extraction middleware
const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'] as string;
    } else if (typeof req.query.token === 'string') {
      token = req.query.token;
    }

    const headerUserId = req.headers['x-user-id'] as string | undefined;
    const headerUsername = req.headers['x-username'] as string | undefined;
    const headerUserData = req.headers['x-user-data'] as string | undefined;

    let user: User | undefined;

    if (token) {
      user = serverDb.findUserByToken(token);
      if (!user && token.startsWith('token_')) {
        // Find matching user from database by ID or username
        user = serverDb.listUsers().find((u) => token?.includes(u.id) || (u.username && token?.includes(u.username)));
      }
    }

    if (!user && headerUserId) {
      user = serverDb.findUserById(headerUserId);
    }

    if (!user && headerUsername) {
      user = serverDb.findUserByUsername(headerUsername);
    }

    // If user payload was passed from authenticated client and not yet in serverDb (e.g. server restart), restore user
    if (!user && headerUserData) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(headerUserData)) as User;
        if (parsedUser && parsedUser.id && parsedUser.username) {
          user = serverDb.findUserById(parsedUser.id) || serverDb.findUserByUsername(parsedUser.username);
          if (!user) {
            user = serverDb.createUser(parsedUser);
          }
        }
      } catch {
        // ignore
      }
    }

    if (user) {
      req.user = user;
      if (token) {
        serverDb.createSessionWithToken(token, user.id);
        req.token = token;
      } else {
        req.token = serverDb.createSession(user.id);
      }
      // Update last active
      serverDb.updateUser(user.id, {
        presence: {
          status: 'online',
          lastActiveAt: new Date().toISOString(),
        },
      });
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
  }

  next();
};

const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  // Banned user check
  if (req.user.moderationStatus === 'banned') {
    const isLogout = req.path.includes('/auth/logout');
    const isMe = req.path.includes('/auth/me');
    if (!isLogout && !isMe) {
      return res.status(403).json({
        error: 'ACCOUNT_BANNED',
        message: req.user.moderationReason || 'Your account has been banned by Admin.',
      });
    }
  }

  next();
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(authMiddleware);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'The Hub Backend API',
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // AUTHENTICATION FLOW
  // ==========================================

  // Register: username + password
  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const { username, password, displayName } = req.body;
      const cleanUsername = (username || '').trim().toLowerCase();

      if (!cleanUsername || cleanUsername.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
      }

      if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
      }

      if (!password || password.trim().length < 3) {
        return res.status(400).json({ error: 'Password must be at least 3 characters long' });
      }

      const existing = serverDb.findUserByUsername(cleanUsername);
      if (existing) {
        return res.status(409).json({ error: 'Username is already taken' });
      }

      const now = new Date().toISOString();
      const name = displayName?.trim() || cleanUsername;
      const newUser: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        username: cleanUsername,
        passwordHash: hashPassword(password),
        profile: {
          displayName: name,
          bio: '',
          avatarInitials: getInitials(name),
          interests: [],
          currentlyLearning: '',
          currentlyBuilding: '',
          joinedAt: now,
          isOnboarded: false,
        },
        presence: {
          status: 'online',
          lastActiveAt: now,
        },
        createdAt: now,
        updatedAt: now,
      };

      const createdUser = serverDb.createUser(newUser);
      const token = serverDb.createSession(createdUser.id);

      // Safe user output without passwordHash
      const { passwordHash: _, ...safeUser } = createdUser;
      return res.status(201).json({ user: safeUser, token });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Registration failed' });
    }
  });

  // Login: username + password
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const cleanUsername = (username || '').trim().toLowerCase();

      if (!cleanUsername) {
        return res.status(400).json({ error: 'Username is required' });
      }

      const user = serverDb.findUserByUsername(cleanUsername);
      if (!user) {
        return res.status(404).json({ error: 'User not found with this username' });
      }

      // Strictly verify password
      if (!password) {
        return res.status(401).json({ error: 'Password is required' });
      }

      if (user.passwordHash) {
        const hashedInput = hashPassword(password);
        if (user.passwordHash !== hashedInput && user.passwordHash !== `mock_hash_${password}`) {
          return res.status(401).json({ error: 'Invalid password' });
        }
      }

      // Update presence
      serverDb.updateUser(user.id, {
        presence: {
          status: 'online',
          lastActiveAt: new Date().toISOString(),
        },
      });

      const token = serverDb.createSession(user.id);
      const { passwordHash: _, ...safeUser } = user;
      return res.json({ user: safeUser, token });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Login failed' });
    }
  });

  // Demo users for quick switcher
  app.get('/api/auth/demo-users', (_req: Request, res: Response) => {
    const users = serverDb.listUsers();
    const safeUsers = users.slice(0, 5).map(({ passwordHash: _, ...safe }) => safe);
    return res.json(safeUsers);
  });

  // Current User session
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { passwordHash: _, ...safeUser } = req.user!;
    return res.json({ user: safeUser, token: req.token });
  });

  // Logout (optional auth)
  app.post('/api/auth/logout', (req: AuthenticatedRequest, res: Response) => {
    if (req.token) {
      serverDb.removeSession(req.token);
    }
    if (req.user) {
      serverDb.updateUser(req.user.id, {
        presence: {
          status: 'offline',
          lastActiveAt: new Date().toISOString(),
        },
      });
    }
    return res.json({ success: true });
  });

  // Update Profile & Onboarding
  app.patch('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const partialProfile: Partial<UserProfile> = req.body;
      const user = req.user!;

      const updated = serverDb.updateUser(user.id, { profile: partialProfile as any });
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { passwordHash: _, ...safeUser } = updated;
      return res.json({ user: safeUser });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to update profile' });
    }
  });

  // ==========================================
  // USERS & PEOPLE DIRECTORY
  // ==========================================

  app.get('/api/users', (_req: Request, res: Response) => {
    const { search, tag } = _req.query;
    const users = serverDb.listUsers(
      typeof search === 'string' ? search : undefined,
      typeof tag === 'string' ? tag : undefined
    );
    const safeUsers = users.map(({ passwordHash, ...safe }) => safe);
    return res.json(safeUsers);
  });

  app.get('/api/users/:id', (req: Request, res: Response) => {
    const user = serverDb.findUserById(req.params.id) || serverDb.findUserByUsername(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { passwordHash, ...safeUser } = user;
    return res.json(safeUser);
  });

  app.patch('/api/users/presence', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { status } = req.body;
    const updated = serverDb.updateUser(req.user!.id, {
      presence: {
        status: status || 'online',
        lastActiveAt: new Date().toISOString(),
      },
    });
    return res.json({ presence: updated?.presence });
  });

  // Admin Moderation endpoint - STRICTLY FOR ADMIN (sidhu001 / moderator / admin)
  app.patch('/api/users/:id/moderation', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.user!;
    const isAdmin =
      adminUser.role === 'moderator' ||
      adminUser.role === 'admin' ||
      adminUser.profile?.role === 'moderator' ||
      adminUser.username === 'sidhu001';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Only Admin (sidhu001) can perform moderation actions' });
    }

    const { moderationStatus, moderationReason } = req.body;
    const targetUser = serverDb.findUserById(req.params.id) || serverDb.findUserByUsername(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    if (targetUser.username === 'sidhu001' && targetUser.id !== adminUser.id) {
      return res.status(403).json({ error: 'Cannot modify primary Admin status' });
    }

    const updated = serverDb.updateUser(targetUser.id, {
      moderationStatus: moderationStatus || 'active',
      moderationReason: moderationReason || '',
    });

    if (!updated) {
      return res.status(500).json({ error: 'Failed to update user moderation' });
    }

    const { passwordHash, ...safeUser } = updated;
    return res.json({ user: safeUser, success: true });
  });

  // ==========================================
  // HYBRID CONNECTION MODEL
  // ==========================================

  app.get('/api/connections', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const connections = serverDb.listConnections(req.user!.id);
    return res.json(connections);
  });

  const handleConnectionRequest = (req: AuthenticatedRequest, res: Response) => {
    const recipientId = req.body?.recipientId || req.body?.targetUserId || req.body?.userId || req.params?.id;
    const sender = req.user!;

    if (!recipientId || recipientId === sender.id) {
      return res.status(400).json({ error: 'Invalid recipient' });
    }

    const recipient = serverDb.findUserById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }

    const existing = serverDb.findConnectionBetween(sender.id, recipientId);
    if (existing) {
      return res.status(409).json({ error: 'Connection already exists or requested', connection: existing });
    }

    const now = new Date().toISOString();
    const newConnection: Connection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: sender.id,
      recipientId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const created = serverDb.createConnection(newConnection);

    // Dispatch in-app notification to recipient
    serverDb.createNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      recipientId,
      type: 'connection_request',
      payload: {
        actorId: sender.id,
        actorName: sender.profile.displayName,
        actorAvatarUrl: sender.profile.avatarUrl,
        actorAvatarInitials: sender.profile.avatarInitials,
        targetId: sender.id,
        targetTitle: `@${sender.username}`,
        messageSnippet: 'sent you a connection request',
        deepLinkUrl: `/people?profile=${sender.id}`,
      },
      isRead: false,
      createdAt: now,
    });

    return res.status(201).json(created);
  };

  app.post('/api/connections', requireAuth, handleConnectionRequest);
  app.post('/api/connections/request', requireAuth, handleConnectionRequest);
  app.post('/api/connections/connect', requireAuth, handleConnectionRequest);
  app.post('/api/connect', requireAuth, handleConnectionRequest);
  app.post('/api/users/:id/connect', requireAuth, handleConnectionRequest);
  app.post('/api/people/:id/connect', requireAuth, handleConnectionRequest);

  const handleAcceptConnection = (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const connectionId = req.params?.id || req.body?.connectionId || req.body?.id;
    const connection = serverDb.getConnection(connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    if (connection.recipientId !== user.id) {
      return res.status(403).json({ error: 'Unauthorized to accept this connection' });
    }

    const updated = serverDb.updateConnection(connection.id, 'accepted');

    // Notify requester
    serverDb.createNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      recipientId: connection.senderId,
      type: 'connection_accepted',
      payload: {
        actorId: user.id,
        actorName: user.profile.displayName,
        actorAvatarUrl: user.profile.avatarUrl,
        actorAvatarInitials: user.profile.avatarInitials,
        targetId: user.id,
        targetTitle: `@${user.username}`,
        messageSnippet: 'accepted your connection request. You can now direct message!',
        deepLinkUrl: `/people?profile=${user.id}`,
      },
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return res.json(updated);
  };

  app.patch('/api/connections/:id/accept', requireAuth, handleAcceptConnection);
  app.post('/api/connections/:id/accept', requireAuth, handleAcceptConnection);
  app.post('/api/connections/accept', requireAuth, handleAcceptConnection);

  const handleDeclineConnection = (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const connectionId = req.params?.id || req.body?.connectionId || req.body?.id;
    const connection = serverDb.getConnection(connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    if (connection.recipientId !== user.id) {
      return res.status(403).json({ error: 'Unauthorized to decline this connection' });
    }

    const updated = serverDb.updateConnection(connection.id, 'declined');
    return res.json(updated);
  };

  app.patch('/api/connections/:id/decline', requireAuth, handleDeclineConnection);
  app.post('/api/connections/:id/decline', requireAuth, handleDeclineConnection);
  app.post('/api/connections/decline', requireAuth, handleDeclineConnection);

  // ==========================================
  // COMMON SPACE FEED & POSTS
  // ==========================================

  app.get('/api/posts', (req: Request, res: Response) => {
    const { authorId } = req.query;
    const posts = serverDb.listPosts(typeof authorId === 'string' ? authorId : undefined);
    const reactions = serverDb.listReactions();
    return res.json({ posts, reactions });
  });

  app.post('/api/posts', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { content, attachment, isPinned } = req.body;
    const user = req.user!;

    if (user.moderationStatus === 'paused' || user.moderationStatus === 'banned') {
      return res.status(403).json({ error: 'Your account is currently in Read-Only mode (paused) or banned by Admin.' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Post content cannot be empty' });
    }

    const isMod =
      user.role === 'moderator' ||
      user.role === 'admin' ||
      user.profile?.role === 'moderator' ||
      user.username === 'sidhu001';

    const now = new Date().toISOString();
    const newPost: Post = {
      id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      authorId: user.id,
      author: {
        id: user.id,
        username: user.username,
        displayName: user.profile.displayName,
        avatarUrl: user.profile.avatarUrl,
        avatarInitials: user.profile.avatarInitials,
        role: (user.role || user.profile?.role) as any,
        isVerified: user.isVerified || user.profile?.isVerified,
      },
      content: content.trim(),
      attachment: attachment as PostAttachment | undefined,
      reactionCount: 0,
      commentCount: 0,
      isEdited: false,
      isPinned: Boolean(isPinned),
      createdAt: now,
      updatedAt: now,
    };

    const created = serverDb.createPost(newPost);
    return res.status(201).json(created);
  });

  app.patch('/api/posts/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { content } = req.body;
    const user = req.user!;
    const post = serverDb.getPost(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.authorId !== user.id) {
      return res.status(403).json({ error: 'Unauthorized to edit this post' });
    }

    const updated = serverDb.updatePost(post.id, {
      content: content.trim(),
      isEdited: true,
    });
    return res.json(updated);
  });

  // Toggle pin on post (allowed for moderators or post author)
  const handleTogglePinPost = (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const post = serverDb.getPost(req.params.id);
    const isMod =
      user.role === 'moderator' ||
      user.role === 'admin' ||
      user.profile?.role === 'moderator' ||
      user.username === 'sidhu001';

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (!isMod && post.authorId !== user.id) {
      return res.status(403).json({ error: 'Only moderators or the author can pin or unpin this post' });
    }

    const updated = serverDb.updatePost(post.id, {
      isPinned: !post.isPinned,
    });
    return res.json(updated);
  };

  app.patch('/api/posts/:id/pin', requireAuth, handleTogglePinPost);
  app.post('/api/posts/:id/pin', requireAuth, handleTogglePinPost);

  app.delete('/api/posts/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const post = serverDb.getPost(req.params.id);
    const isMod =
      user.role === 'moderator' ||
      user.role === 'admin' ||
      user.profile?.role === 'moderator' ||
      user.username === 'sidhu001';

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.authorId !== user.id && !isMod) {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }

    serverDb.deletePost(post.id);
    return res.json({ success: true });
  });

  // Reactions
  const handleReact = (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const post = serverDb.getPost(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const result = serverDb.toggleReaction(post.id, user.id);

    // If reacted, send notification to author
    if (result.reacted && post.authorId !== user.id) {
      serverDb.createNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        recipientId: post.authorId,
        type: 'post_reaction',
        payload: {
          actorId: user.id,
          actorName: user.profile.displayName,
          actorAvatarUrl: user.profile.avatarUrl,
          actorAvatarInitials: user.profile.avatarInitials,
          targetId: post.id,
          targetTitle: post.content.slice(0, 50) + (post.content.length > 50 ? '...' : ''),
          messageSnippet: 'reacted 🔥 to your post',
          deepLinkUrl: `/common-space?post=${post.id}`,
        },
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    return res.json(result);
  };

  app.post('/api/posts/:id/react', requireAuth, handleReact);
  app.post('/api/posts/:id/reactions', requireAuth, handleReact);

  // Comments / Flat 1-level replies
  app.get('/api/posts/:id/comments', (req: Request, res: Response) => {
    const comments = serverDb.listComments(req.params.id);
    return res.json(comments);
  });

  app.post('/api/posts/:id/comments', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { content } = req.body;
    const user = req.user!;

    if (user.moderationStatus === 'muted' || user.moderationStatus === 'paused' || user.moderationStatus === 'banned') {
      return res.status(403).json({ error: 'Your account is currently restricted from commenting by Admin.' });
    }

    const post = serverDb.getPost(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    const now = new Date().toISOString();
    const newComment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      postId: post.id,
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
      updatedAt: now,
    };

    const created = serverDb.createComment(newComment);

    // Notify author if not self
    if (post.authorId !== user.id) {
      serverDb.createNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        recipientId: post.authorId,
        type: 'post_reply',
        payload: {
          actorId: user.id,
          actorName: user.profile.displayName,
          actorAvatarUrl: user.profile.avatarUrl,
          actorAvatarInitials: user.profile.avatarInitials,
          targetId: post.id,
          targetTitle: post.content.slice(0, 50) + (post.content.length > 50 ? '...' : ''),
          messageSnippet: content.slice(0, 80),
          deepLinkUrl: `/common-space?post=${post.id}`,
        },
        isRead: false,
        createdAt: now,
      });
    }

    // Mention detection
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedUsername = match[1].toLowerCase();
      const mentionedUser = serverDb.findUserByUsername(mentionedUsername);
      if (mentionedUser && mentionedUser.id !== user.id && mentionedUser.id !== post.authorId) {
        serverDb.createNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          recipientId: mentionedUser.id,
          type: 'post_reply',
          payload: {
            actorId: user.id,
            actorName: user.profile.displayName,
            actorAvatarUrl: user.profile.avatarUrl,
            actorAvatarInitials: user.profile.avatarInitials,
            targetId: post.id,
            targetTitle: 'Mentioned you in a comment',
            messageSnippet: content.slice(0, 80),
            deepLinkUrl: `/common-space?post=${post.id}`,
          },
          isRead: false,
          createdAt: now,
        });
      }
    }

    return res.status(201).json(created);
  });

  app.delete('/api/posts/:id/comments/:commentId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const comment = serverDb.getComment(req.params.commentId);
    const isMod =
      user.role === 'moderator' ||
      user.role === 'admin' ||
      user.profile?.role === 'moderator' ||
      user.username === 'sidhu001';

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (comment.authorId !== user.id && !isMod) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    serverDb.deleteComment(comment.id);
    return res.json({ success: true });
  });

  // ==========================================
  // PROJECTS ECOSYSTEM & COLLABORATION
  // ==========================================

  app.get('/api/projects', (req: Request, res: Response) => {
    const { search, tag } = req.query;
    const projects = serverDb.listProjects(
      typeof search === 'string' ? search : undefined,
      typeof tag === 'string' ? tag : undefined
    );
    return res.json(projects);
  });

  app.get('/api/projects/interests', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const projectId = req.query.projectId as string | undefined;
    const interests = serverDb.listProjectInterests(projectId, user.id);
    return res.json(interests);
  });

  app.get('/api/projects/:id', (req: Request, res: Response) => {
    const project = serverDb.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const updates = serverDb.listProjectUpdates(project.id);
    const discussions = serverDb.listProjectDiscussions(project.id);
    const interests = serverDb.listProjectInterests(project.id);
    return res.json({ project, updates, discussions, interests });
  });

  app.post('/api/projects', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { name, tagline, description, lookingForTags, links, coverImageUrl } = req.body;
    const user = req.user!;

    if (!name?.trim() || !tagline?.trim()) {
      return res.status(400).json({ error: 'Project name and tagline are required' });
    }

    const now = new Date().toISOString();
    const newProject: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      tagline: tagline.trim(),
      description: (description || '').trim(),
      coverImageUrl,
      ownerId: user.id,
      team: [{ userId: user.id, role: 'owner', joinedAt: now }],
      lookingForTags: Array.isArray(lookingForTags) ? lookingForTags : [],
      links: Array.isArray(links) ? links : [],
      updatesCount: 0,
      discussionCount: 0,
      interestCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const created = serverDb.createProject(newProject);
    return res.status(201).json(created);
  });

  app.patch('/api/projects/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const project = serverDb.getProject(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (project.ownerId !== user.id) {
      return res.status(403).json({ error: 'Only the project owner can edit this project' });
    }

    const updated = serverDb.updateProject(project.id, req.body);
    return res.json(updated);
  });

  // Project Updates
  app.post('/api/projects/:id/updates', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { title, content, imageUrl } = req.body;
    const user = req.user!;
    const project = serverDb.getProject(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (project.ownerId !== user.id) {
      return res.status(403).json({ error: 'Only project owners can post official updates' });
    }

    const update: ProjectUpdate = {
      id: `upd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId: project.id,
      authorId: user.id,
      title: title.trim(),
      content: content.trim(),
      imageUrl,
      createdAt: new Date().toISOString(),
    };

    const created = serverDb.createProjectUpdate(update);
    return res.status(201).json(created);
  });

  // Project Discussions
  app.post('/api/projects/:id/discussions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { content } = req.body;
    const user = req.user!;
    const project = serverDb.getProject(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Discussion message cannot be empty' });
    }

    const discussion: ProjectDiscussion = {
      id: `disc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId: project.id,
      authorId: user.id,
      author: {
        id: user.id,
        username: user.username,
        displayName: user.profile.displayName,
        avatarUrl: user.profile.avatarUrl,
        avatarInitials: user.profile.avatarInitials,
      },
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    const created = serverDb.createProjectDiscussion(discussion);
    return res.status(201).json(created);
  });

  // "I'm interested" & "Pitch" CTA flows
  const handleProjectInterest = (req: AuthenticatedRequest, res: Response) => {
    const { message } = req.body || {};
    const user = req.user!;
    const projectId = req.params?.id || req.body?.projectId || req.body?.id;
    const project = serverDb.getProject(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (project.ownerId === user.id) {
      return res.status(400).json({ error: 'You are the owner of this project' });
    }

    const now = new Date().toISOString();
    const interest: ProjectInterest = {
      id: `int_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId: project.id,
      userId: user.id,
      applicant: {
        id: user.id,
        username: user.username,
        displayName: user.profile.displayName,
        avatarUrl: user.profile.avatarUrl,
        avatarInitials: user.profile.avatarInitials,
      },
      message: (message || '').trim(),
      status: 'submitted',
      createdAt: now,
    };

    const created = serverDb.createProjectInterest(interest);

    // Notify owner
    serverDb.createNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      recipientId: project.ownerId,
      type: 'project_interest',
      payload: {
        actorId: user.id,
        actorName: user.profile.displayName,
        actorAvatarUrl: user.profile.avatarUrl,
        actorAvatarInitials: user.profile.avatarInitials,
        targetId: project.id,
        targetTitle: project.name,
        messageSnippet: message ? `"${message.slice(0, 60)}..."` : 'expressed interest in joining your project',
        deepLinkUrl: `/projects/${project.id}`,
      },
      isRead: false,
      createdAt: now,
    });

    return res.status(201).json(created);
  };

  app.post('/api/projects/:id/interest', requireAuth, handleProjectInterest);
  app.post('/api/projects/:id/pitch', requireAuth, handleProjectInterest);
  app.post('/api/projects/:id/pitches', requireAuth, handleProjectInterest);
  app.post('/api/projects/:id/interests', requireAuth, handleProjectInterest);
  app.post('/api/projects/interest', requireAuth, handleProjectInterest);
  app.post('/api/projects/pitch', requireAuth, handleProjectInterest);
  app.post('/api/pitch', requireAuth, handleProjectInterest);

  const handleUpdateInterestStatus = (req: AuthenticatedRequest, res: Response) => {
    const { status } = req.body || {};
    const interestId = req.params?.interestId || req.body?.interestId;
    return res.json({ success: true, interestId, status: status || 'accepted' });
  };

  app.patch('/api/projects/:id/interest/:interestId', requireAuth, handleUpdateInterestStatus);
  app.post('/api/projects/:id/interest/:interestId', requireAuth, handleUpdateInterestStatus);
  app.patch('/api/projects/:id/pitch/:interestId', requireAuth, handleUpdateInterestStatus);
  app.post('/api/projects/:id/pitch/:interestId', requireAuth, handleUpdateInterestStatus);

  // ==========================================
  // MESSAGES & REAL-TIME CHAT
  // ==========================================

  app.get('/api/conversations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const convs = serverDb.listConversations(user.id);
    return res.json(convs);
  });

  app.get('/api/conversations/:id/messages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const conv = serverDb.getConversation(req.params.id);

    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const isGeneral = conv.type === 'general' || conv.id === 'conv_general';
    if (!isGeneral && !conv.participantIds.includes(user.id)) {
      return res.status(403).json({ error: 'Unauthorized to view this conversation' });
    }

    // Ensure general chat includes user in participants
    if (isGeneral && !conv.participantIds.includes(user.id)) {
      conv.participantIds.push(user.id);
      serverDb.persist();
    }

    const messages = serverDb.listMessages(conv.id);
    return res.json(messages);
  });

  app.post('/api/conversations/direct', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { targetUserId } = req.body;
    const user = req.user!;

    if (!targetUserId || targetUserId === user.id) {
      return res.status(400).json({ error: 'Invalid target user' });
    }

    const targetUser = serverDb.findUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    // Direct messaging gating: allow if either party is a moderator/community lead, otherwise check mutual connection
    const isCurrentMod =
      user.role === 'moderator' ||
      user.role === 'admin' ||
      user.profile?.role === 'moderator' ||
      user.username === 'sidhu001';
    const isTargetMod =
      targetUser.role === 'moderator' ||
      targetUser.role === 'admin' ||
      targetUser.profile?.role === 'moderator' ||
      targetUser.username === 'sidhu001';

    const canMessage = isCurrentMod || isTargetMod || serverDb.canMessage(user.id, targetUserId);
    if (!canMessage) {
      return res.status(403).json({
        error: 'Direct messaging is unlocked only after a mutual connection request is accepted.',
      });
    }

    // Check existing direct conversation
    const existing = serverDb.findDirectConversation(user.id, targetUserId);
    if (existing) {
      return res.json(existing);
    }

    const now = new Date().toISOString();
    const newConv: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'direct',
      participantIds: [user.id, targetUserId],
      unreadCounts: {},
      createdAt: now,
      updatedAt: now,
    };

    const created = serverDb.createConversation(newConv);
    return res.status(201).json(created);
  });

  app.post('/api/conversations/group', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { title, description, participantIds } = req.body;
    const user = req.user!;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Group title is required' });
    }

    const uniqueParticipants = Array.from(new Set([user.id, ...(participantIds || [])]));
    const now = new Date().toISOString();
    const groupConv: Conversation = {
      id: `conv_group_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'custom_group',
      title: title.trim(),
      description: (description || '').trim(),
      participantIds: uniqueParticipants,
      unreadCounts: {},
      createdAt: now,
      updatedAt: now,
    };

    const created = serverDb.createConversation(groupConv);
    return res.status(201).json(created);
  });

  app.post('/api/conversations/:id/messages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { content, quotedMessageId, imageUrl } = req.body;
    const user = req.user!;

    if (user.moderationStatus === 'muted' || user.moderationStatus === 'paused' || user.moderationStatus === 'banned') {
      return res.status(403).json({ error: 'Your account is currently restricted from sending messages by Admin.' });
    }

    const conv = serverDb.getConversation(req.params.id);

    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const isGeneral = conv.type === 'general' || conv.id === 'conv_general';
    if (!isGeneral && !conv.participantIds.includes(user.id)) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }
    if ((!content || !content.trim()) && !imageUrl) {
      return res.status(400).json({ error: 'Message content or image is required' });
    }

    if (isGeneral && !conv.participantIds.includes(user.id)) {
      conv.participantIds.push(user.id);
      serverDb.persist();
    }

    const now = new Date().toISOString();
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId: conv.id,
      senderId: user.id,
      sender: {
        id: user.id,
        username: user.username,
        displayName: user.profile.displayName,
        avatarUrl: user.profile.avatarUrl,
        avatarInitials: user.profile.avatarInitials,
      },
      content: (content || '').trim(),
      imageUrl: imageUrl || undefined,
      quotedMessageId,
      createdAt: now,
      updatedAt: now,
    };

    const created = serverDb.createMessage(message);
    return res.status(201).json(created);
  });

  app.put('/api/conversations/:id/messages/:messageId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { content } = req.body;
    const user = req.user!;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const messages = serverDb.listMessages(req.params.id);
    const existing = messages.find((m) => m.id === req.params.messageId);
    if (!existing) {
      return res.status(404).json({ error: 'Message not found' });
    }
    if (existing.senderId !== user.id && user.role !== 'moderator') {
      return res.status(403).json({ error: 'Unauthorized to edit this message' });
    }

    const updated = serverDb.updateMessage(req.params.messageId, content.trim());
    return res.json(updated);
  });

  app.delete('/api/conversations/:id/messages/:messageId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const messages = serverDb.listMessages(req.params.id);
    const existing = messages.find((m) => m.id === req.params.messageId);
    if (!existing) {
      return res.status(404).json({ error: 'Message not found' });
    }
    if (existing.senderId !== user.id && user.role !== 'moderator') {
      return res.status(403).json({ error: 'Unauthorized to delete this message' });
    }

    serverDb.deleteMessage(req.params.messageId);
    return res.json({ success: true, messageId: req.params.messageId });
  });

  app.patch('/api/conversations/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    serverDb.markConversationRead(req.params.id, user.id);
    return res.json({ success: true });
  });

  // Pin or unpin a message in a conversation
  const handlePinConversationMessage = (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { messageId } = req.body;
    const conv = serverDb.getConversation(req.params.id);

    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isGeneral = conv.type === 'general' || conv.id === 'conv_general';
    const isMember = isGeneral || conv.participantIds.includes(user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }

    const updated = serverDb.pinMessageToConversation(conv.id, messageId || null);
    return res.json(updated);
  };

  app.patch('/api/conversations/:id/pin', requireAuth, handlePinConversationMessage);
  app.post('/api/conversations/:id/pin', requireAuth, handlePinConversationMessage);

  // ==========================================
  // IN-APP NOTIFICATIONS
  // ==========================================

  app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const notifications = serverDb.listNotifications(user.id);
    return res.json(notifications);
  });

  app.patch('/api/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    serverDb.markNotificationRead(req.params.id, user.id);
    return res.json({ success: true });
  });

  app.patch('/api/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    serverDb.markAllNotificationsRead(user.id);
    return res.json({ success: true });
  });

  // ==========================================
  // GLOBAL GROUPED SEARCH
  // ==========================================

  app.get('/api/search', (req: Request, res: Response) => {
    const { q } = req.query;
    const query = typeof q === 'string' ? q : '';
    const results = serverDb.searchAll(query);
    return res.json(results);
  });

  // ==========================================
  // ADMIN & SEED RESET
  // ==========================================

  app.post('/api/admin/reset', (_req: Request, res: Response) => {
    serverDb.resetToSeed();
    return res.json({ success: true, message: 'Database reset to clean seed data' });
  });

  // Catch-all 404 handler for unhandled /api requests to prevent HTML fallback
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found` });
  });

  // Global Express JSON error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('API Error:', err);
    res.status(err?.status || 500).json({ error: err?.message || 'Internal server error' });
  });

  // ==========================================
  // VITE MIDDLEWARE OR STATIC ASSETS
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`The Hub Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
