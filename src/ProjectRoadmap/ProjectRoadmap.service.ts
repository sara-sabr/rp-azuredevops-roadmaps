import {
  TreeStructureGroup,
  WorkItemClassificationNode,
} from "azure-devops-extension-api/WorkItemTracking";

import {
  CommonRepositories,
  ProjectService,
  SearchRepository,
  SearchResultEntity,
  TreeNode,
} from "@esdc-it-rp/azuredevops-common";
import { ProjectRoadmapConfig } from "./ProjectRoadmap.config";
import { ProjectRoadmapTaskEntity } from "./ProjectRoadmapTask.entity";

/**
 * Service for project roadmap.
 */
export class ProjectRoadmapService {
  /**
   * Get the latest project status.
   *
   * @param asOf the date or undefined to get latest.
   */
  static async getRoadmaps(
    asOf?: Date
  ): Promise<SearchResultEntity<ProjectRoadmapTaskEntity, number>> {
    const roadmaps: SearchResultEntity<ProjectRoadmapTaskEntity, number> =
      await SearchRepository.executeQuery(
        ProjectRoadmapConfig.getQueryForLatest(),
        ProjectRoadmapTaskEntity,
        asOf
      );

    return roadmaps;
  }

  /**
   * Area paths that are available to the project.
   */
  static async getAreaPathsForProject(): Promise<WorkItemClassificationNode[]> {
    const projectName = await ProjectService.getProjectName();
    const classificatioNodes =
      await CommonRepositories.WIT_API_CLIENT.getClassificationNode(
        projectName,
        TreeStructureGroup.Areas,
        undefined,
        1
      );
    return classificatioNodes.children;
  }

  /**
   * Get the top level field path.
   *
   * Ex: <project>/<path>/<subpath> will return <project>/<path>
   * @param areaPath the area path
   */
  public static getTopLevelAreaPath(areaPath: string): string {
    if (areaPath === undefined || areaPath.length === 0) {
      return "";
    }

    let slashIndex = areaPath.indexOf("\\");

    if (slashIndex >= 0) {
      slashIndex = areaPath.indexOf("\\", slashIndex + 1);

      if (slashIndex >= 0) {
        areaPath = areaPath.substring(0, slashIndex);
      }
    }

    return areaPath;
  }

  /**
   * This Function updates the result object into a postorder array.
   *
   * @param node the current node
   * @param result a post order walk of the tree
   */
  static traverse(
    node: SearchResultEntity<ProjectRoadmapTaskEntity, number>,
    result: ProjectRoadmapTaskEntity[]
  ): void {
    if (node === undefined) return;
    for (const child of node.children)
      ProjectRoadmapService.traverse(child, result);
    if (node.data) result.push(node.data);
  }

  /**
   * This Function calculates the progress for all work items using recursion.
   *
   * @param roadmapTree the tree structure of the work items.
   * @returns ordered tasks with a populated progress percent.
   */
  static updateWorkItemProgress(
    roadmapTree: SearchResultEntity<ProjectRoadmapTaskEntity, number>
  ): ProjectRoadmapTaskEntity[] {
    const result: ProjectRoadmapTaskEntity[] = [];

    ProjectRoadmapService.traverse(roadmapTree, result);

    let workItem: ProjectRoadmapTaskEntity;
    let calculatedProgress: number;
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    for (var i = 0; i <= result.length; i++) {
      workItem = result[i];
      calculatedProgress = 0;

      if (workItem) {
        const currentNode = roadmapTree.nodeMap?.get(workItem.id);
        if (currentNode === undefined) {
          continue;
        }

        // Calculate the progress for the work item.
        if (currentNode.isLeaf()) {
          if (workItem.state === "Done") {
            calculatedProgress = 100;
          }
        } else {
          startDate = undefined;
          endDate = undefined;

          currentNode.children.forEach((child) => {
            if (child.data) {
              if (
                startDate === undefined ||
                (child.data.start && child.data.start < startDate)
              ) {
                startDate = child.data.start;
              }
              if (
                endDate === undefined ||
                (child.data.end && child.data.end > endDate)
              ) {
                endDate = child.data.end;
              }

              // If no progress set, set to 0
              calculatedProgress += child.data.progress
                ? child.data.progress
                : 0;
            }
          });
          calculatedProgress /= currentNode.totalChildren();

          if (startDate && workItem.start === undefined) {
            workItem.start = startDate;
            workItem.calculatedDates = true;
          }

          if (endDate && workItem.end === undefined) {
            workItem.end = endDate;
            workItem.calculatedDates = true;
          }
        }

        workItem.progress = calculatedProgress;
      }
    }

    return result;
  }

  /**
   * Create the gantt chart
   *
   * @param asOf date to pull data from or undefined for today.
   * @returns the tasks for the gantt chart
   */
  static async createGantt(asOf?: Date): Promise<ProjectRoadmapTaskEntity[]> {
    const roadmapTree = await this.getRoadmaps(asOf);
    const projectRoadmaps: ProjectRoadmapTaskEntity[] = [];
    const stack: ProjectRoadmapTaskEntity[] = [];
    let currentData: ProjectRoadmapTaskEntity | undefined;
    let currentNode: TreeNode<ProjectRoadmapTaskEntity, number> | undefined;

    // We will now walk the tree that is produced - Preorder walk.
    if (!roadmapTree.isEmpty()) {
      // Push all the projects onto the stack.
      // TODO: Fix order as last one will be popped first.
      for (let node of roadmapTree.children) {
        if (node.data) {
          stack.push(node.data);
        }
      }
    }

    // Loop over the stack untl we finish walking the tree. - Preorder
    while (stack.length > 0) {
      currentData = stack.pop();
      if (currentData) {
        projectRoadmaps.push(currentData);
        currentNode = roadmapTree.nodeMap?.get(currentData.id);

        if (currentNode) {
          // Add all children.
          for (let node of currentNode.children) {
            if (node.data) {
              // TODO: Fix order as last one will be popped first.
              stack.push(node.data);
            }
          }
        }
      }
    }

    let currentParentId: number;
    for (let entry of projectRoadmaps) {
      currentParentId = entry.parent;
      while (currentParentId !== 0 && currentParentId !== undefined) {
        entry.project = currentParentId.toString();
        currentNode = roadmapTree.nodeMap?.get(currentParentId);
        if (currentNode && currentNode.data) {
          currentParentId = currentNode.data.parent;
        } else {
          currentParentId = 0;
        }
      }
    }

    ProjectRoadmapService.updateWorkItemProgress(roadmapTree);
    return projectRoadmaps;
  }
}
