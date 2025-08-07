import { Pool } from 'pg';

/**
 * Result shape for team statistics including counts and keywords
 */
export interface TeamStatsResult {
  teamId: string;
  totalCount: number;
  publicCount: number;
  privateCount: number;
  anonymousCount: number;
  topKeywords: string[];
}

/**
 * AnalyticsService handles reporting, trends, and keyword statistics
 */
export class AnalyticsService {
  constructor(private db: Pool) {}

  /**
   * Returns aggregated recognition statistics for a team
   * @param teamId - the ID of the team
   * @param userRole - role of the requesting user (e.g., MANAGER, HR, ADMIN)
   */
  async getTeamStats(teamId: string, userRole: string): Promise<TeamStatsResult> {
    if (!this.canAccessTeamAnalytics(userRole)) {
      throw new Error('Insufficient permissions - Manager role or higher required');
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN visibility = 'PUBLIC' THEN 1 END) as public_count,
        COUNT(CASE WHEN visibility = 'PRIVATE' THEN 1 END) as private_count,
        COUNT(CASE WHEN visibility = 'ANONYMOUS' THEN 1 END) as anonymous_count
      FROM recognitions r
      JOIN users u ON r.recipient_id = u.id
      WHERE u.team_id = $1
    `;

    const statsResult = await this.db.query(statsQuery, [teamId]);
    const stats = statsResult.rows[0];
    const topKeywords = await this.getTeamTopKeywords(teamId);

    return {
      teamId,
      totalCount: parseInt(stats.total || '0'),
      publicCount: parseInt(stats.public_count || '0'),
      privateCount: parseInt(stats.private_count || '0'),
      anonymousCount: parseInt(stats.anonymous_count || '0'),
      topKeywords
    };
  }

  /**
   * Returns organization-wide recognition analytics
   * @param userRole - current user's role (must be HR or ADMIN)
   */
  async getOrganizationAnalytics(userRole: string) {
    if (!this.canAccessOrganizationAnalytics(userRole)) {
      throw new Error('Insufficient permissions - HR role or higher required');
    }

    const query = `
      SELECT 
        COUNT(*) as total_recognitions,
        COUNT(DISTINCT sender_id) as active_recognizers,
        COUNT(DISTINCT recipient_id) as recognized_employees,
        COUNT(CASE WHEN visibility = 'PUBLIC' THEN 1 END) as public_recognitions
      FROM recognitions
    `;

    const result = await this.db.query(query);
    const stats = result.rows[0];
    const topKeywords = await this.getOrganizationTopKeywords();

    return {
      totalRecognitions: parseInt(stats.total_recognitions || '0'),
      activeRecognizers: parseInt(stats.active_recognizers || '0'),
      recognizedEmployees: parseInt(stats.recognized_employees || '0'),
      publicRecognitions: parseInt(stats.public_recognitions || '0'),
      topKeywords
    };
  }

  /**
   * Returns daily recognition trends for either an entire org or a specific team
   * @param userRole - user's role
   * @param teamId - optional team scope (if not provided, returns org-wide data)
   */
  async getRecognitionTrends(userRole: string, teamId?: string) {
    if (!this.canAccessTeamAnalytics(userRole)) {
      throw new Error('Insufficient permissions');
    }

    let query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COUNT(CASE WHEN visibility = 'PUBLIC' THEN 1 END) as public_count
      FROM recognitions r
    `;

    const params: string[] = [];
    let whereClause = '';

    if (teamId) {
      query += ' JOIN users u ON r.recipient_id = u.id';
      whereClause = ' WHERE u.team_id = $1';
      params.push(teamId);
    }

    query += `${whereClause} GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30`;

    const result = await this.db.query(query, params);

    return result.rows.map(row => ({
      date: row.date,
      totalCount: parseInt(row.count),
      publicCount: parseInt(row.public_count || '0'),
      trend: 0 // Simplified - extend for real trend calculation
    }));
  }

  /**
   * Returns the top N keywords for a given team
   * @param teamId - team identifier
   * @param limit - max keywords to return (default: 5)
   */
  private async getTeamTopKeywords(teamId: string, limit: number = 5): Promise<string[]> {
    const query = `
      SELECT keyword, COUNT(*) as count
      FROM (
        SELECT jsonb_array_elements_text(keywords) as keyword
        FROM recognitions r
        JOIN users u ON r.recipient_id = u.id
        WHERE u.team_id = $1 AND jsonb_array_length(keywords) > 0
      ) keywords_expanded
      GROUP BY keyword
      ORDER BY count DESC
      LIMIT $2
    `;

    try {
      const result = await this.db.query(query, [teamId, limit]);
      return result.rows.map(row => row.keyword);
    } catch (error) {
      console.warn('Keyword extraction failed:', error);
      return ['great', 'excellent', 'outstanding', 'work', 'project'];
    }
  }

  /**
   * Returns top keywords across the entire organization
   * @param limit - max keywords to return (default: 10)
   */
  private async getOrganizationTopKeywords(limit: number = 10): Promise<string[]> {
    const query = `
      SELECT keyword, COUNT(*) as count
      FROM (
        SELECT jsonb_array_elements_text(keywords) as keyword
        FROM recognitions r
        WHERE jsonb_array_length(keywords) > 0
      ) keywords_expanded
      GROUP BY keyword
      ORDER BY count DESC
      LIMIT $1
    `;

    try {
      const result = await this.db.query(query, [limit]);
      return result.rows.map(row => row.keyword);
    } catch (error) {
      console.warn('Organization keyword extraction failed:', error);
      return ['excellent', 'great', 'outstanding', 'work', 'project', 'team', 'collaboration'];
    }
  }

  /**
   * Checks if user role is permitted to view team-level analytics
   */
  private canAccessTeamAnalytics(userRole: string): boolean {
    const allowedRoles = ['MANAGER', 'HR', 'ADMIN'];
    return allowedRoles.includes(userRole);
  }

  /**
   * Checks if user role is permitted to view org-wide analytics
   */
  private canAccessOrganizationAnalytics(userRole: string): boolean {
    const allowedRoles = ['HR', 'ADMIN'];
    return allowedRoles.includes(userRole);
  }

  /**
   * Calculates aggregate recognition metrics such as user coverage and keyword richness
   * @param teamId - optional team ID filter
   */
  async getRecognitionMetrics(teamId?: string) {
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT sender_id) as unique_senders,
        COUNT(DISTINCT recipient_id) as unique_recipients,
        AVG(jsonb_array_length(keywords)) as avg_keywords
      FROM recognitions r
    `;

    const params: string[] = [];

    if (teamId) {
      query += `
        JOIN users u ON r.recipient_id = u.id
        WHERE u.team_id = $1
      `;
      params.push(teamId);
    }

    const result = await this.db.query(query, params);
    const metrics = result.rows[0];

    return {
      totalRecognitions: parseInt(metrics.total || '0'),
      uniqueSenders: parseInt(metrics.unique_senders || '0'),
      uniqueRecipients: parseInt(metrics.unique_recipients || '0'),
      averageKeywords: parseFloat(metrics.avg_keywords || '0')
    };
  }
}