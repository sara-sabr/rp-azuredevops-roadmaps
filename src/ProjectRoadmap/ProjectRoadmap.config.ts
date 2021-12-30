import { Constants, SearchRepository } from "@esdc-it-rp/azuredevops-common";

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
}
