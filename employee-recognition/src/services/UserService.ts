import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

// Interface for login response format
export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
  };
}

/**
 * Service class for user-related operations.
 */
export class UserService {
  /**
   * @param db - PostgreSQL connection pool
   */
  constructor(private db: Pool) {}

  /**
   * Logs in a user by their email.
   * @param email - Email address of the user.
   * @returns A JWT token and user details.
   */
  async login(email: string): Promise<LoginResponse> {
    const result = await this.db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      throw new Error('User not found');
    }

    const token = this.generateJWT(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at
      }
    };
  }

  /**
   * Fetches the currently logged-in user's profile.
   * @param userId - ID of the user.
   * @returns User details.
   */
  async getCurrentUser(userId: string) {
    const result = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (!result.rows[0]) {
      throw new Error('User not found');
    }

    return this.formatUser(result.rows[0]);
  }

  /**
   * Fetch a user by their ID.
   * @param id - User ID.
   * @returns User object or null.
   */
  async getUserById(id: string) {
    const result = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0] ? this.formatUser(result.rows[0]) : null;
  }

  /**
   * Lists all users ordered by name.
   * @param limit - Max number of users to fetch.
   * @returns Array of users.
   */
  async getUsers(limit: number = 20) {
    const result = await this.db.query(
      'SELECT * FROM users ORDER BY name ASC LIMIT $1',
      [limit]
    );

    return result.rows.map(user => this.formatUser(user));
  }

  /**
   * Fetch the team details by team ID.
   * @param teamId - ID of the team.
   * @returns Team object or null.
   */
  async getUserTeam(teamId: string) {
    if (!teamId) return null;

    const result = await this.db.query(
      'SELECT * FROM teams WHERE id = $1',
      [teamId]
    );

    const team = result.rows[0];
    if (!team) return null;

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      createdAt: team.created_at
    };
  }

  /**
   * List all users in a team.
   * @param teamId - ID of the team.
   * @returns Array of user objects.
   */
  async getTeamMembers(teamId: string) {
    const result = await this.db.query(
      'SELECT * FROM users WHERE team_id = $1 ORDER BY name ASC',
      [teamId]
    );

    return result.rows.map(user => this.formatUser(user));
  }

  /**
   * Checks if a user has required role permission.
   * @param userRole - Role of the current user.
   * @param requiredRole - Required role to access resource.
   * @returns Boolean indicating if access is allowed.
   */
  hasRole(userRole: string, requiredRole: string): boolean {
    const roleHierarchy = {
      'EMPLOYEE': 1,
      'MANAGER': 2,
      'HR': 3,
      'ADMIN': 4
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Checks if the user can access team-level analytics.
   * @param userRole - Role of the user.
   */
  canAccessTeamAnalytics(userRole: string): boolean {
    return this.hasRole(userRole, 'MANAGER');
  }

  /**
   * Checks if the user can access organization-wide analytics.
   * @param userRole - Role of the user.
   */
  canAccessOrganizationAnalytics(userRole: string): boolean {
    return this.hasRole(userRole, 'HR');
  }

  /**
   * Generates a signed JWT token for a user.
   * @param user - User payload.
   * @returns Signed JWT string.
   */
  private generateJWT(user: any): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
  }

  /**
   * Verifies a JWT token.
   * @param token - JWT string.
   * @returns Decoded user payload.
   */
  verifyToken(token: string) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!) as any;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Converts raw DB row into formatted user object.
   * @param user - Raw user DB row.
   * @returns Formatted user object.
   */
  private formatUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.team_id,
      createdAt: user.created_at
    };
  }
}
