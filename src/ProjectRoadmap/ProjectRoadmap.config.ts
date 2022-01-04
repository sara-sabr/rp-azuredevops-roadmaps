import { Constants, SearchRepository } from "@esdc-it-rp/azuredevops-common";
/**
 * Configurations for project roadmap.
 */
export class ProjectRoadmapConfig {
  private static readonly ROADMAP_FOLDER = "Roadmap";

  /**
   * Get the configuration for the latest status report.
   *
   * @returns the name of the query.
   */
   public static getQueryForLatest(): string {
    return SearchRepository.buildQueryFQN(
      Constants.DEFAULT_QUERIES_SHARED_FOLDER,
      Constants.DEFAULT_QUERIES_EXTENSION_FOLDER,
      ProjectRoadmapConfig.ROADMAP_FOLDER,
      "Latest"
    );
  }

  /**
   * The relationships query such as predecessor and successor of work items.
   *
   * @returns the query for the relationships.
   */
  public static getQueryForRelations(): string {
    return SearchRepository.buildQueryFQN(
      Constants.DEFAULT_QUERIES_SHARED_FOLDER,
      Constants.DEFAULT_QUERIES_EXTENSION_FOLDER,
      ProjectRoadmapConfig.ROADMAP_FOLDER,
      "Relations"
    );
  }
}
