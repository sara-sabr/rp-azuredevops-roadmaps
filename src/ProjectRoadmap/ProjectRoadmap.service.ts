// Library
import {
  TreeStructureGroup,
  WorkItemClassificationNode,
} from "azure-devops-extension-api/WorkItemTracking";

// Project
import {
  CommonRepositories,
  ProjectCacheService,
  ProjectService,
  SearchRepository,
  SearchResultEntity,
  TreeNode,
  WorkItemProcessService,
  WorkItemTypeEntity,
} from "@esdc-it-rp/azuredevops-common";
import { ProjectRoadmapConfig } from "./ProjectRoadmap.config";
import { ProjectRoadmapTaskEntity } from "./ProjectRoadmapTask.entity";
import { BacklogEntity } from "./Backlog.entity";

/**
 * Service for project roadmap.
 */
export class ProjectRoadmapService {
  /**
   * Get the latest project status.
   *
   * @param modifiedAfter the date of items to get after this date
   * @param asOf the date or undefined to get latest.
   */
  static async getRoadmaps(
    modifiedAfter?: Date,
    asOf?: Date
  ): Promise<SearchResultEntity<ProjectRoadmapTaskEntity, number>> {
    const queryName = ProjectRoadmapConfig.getQueryForLatest();
    const query = await SearchRepository.getQuery(queryName);
    var wiql = query.wiql;

    if (modifiedAfter) {
      var orderByIdx = wiql.indexOf(" order by ");
      var queryStatement = wiql.substring(0, orderByIdx);
      // YYYY-MM-DD (Index 10 is right up to the date)
      var date = modifiedAfter.toISOString().substring(0, 10);
      wiql = queryStatement + " and Source.[System.ChangedDate] >= '";
      wiql += date + "' ";
      wiql += query.wiql.substring(orderByIdx);
    }

    const roadmaps: SearchResultEntity<ProjectRoadmapTaskEntity, number> =
      await SearchRepository.executeQueryWiql(wiql, ProjectRoadmapTaskEntity);

    return roadmaps;
  }

  /**
   * Get the backlog levels and the items under them.
   *
   * @returns the backlog levels.
   */
  static async getBacklogLevels(): Promise<BacklogEntity[]> {
    const backlogLevelsArray: BacklogEntity[] = [];
    const projectId = await ProjectService.getProjectId();
    const projectInfo = await CommonRepositories.CORE_API_CLIENT.getProject(
      projectId
    );
    const defaultTeam = projectInfo.defaultTeam;
    const backlogInfo = await CommonRepositories.WORK_API_CLIENT.getBacklogs({
      projectId: projectId,
      project: projectInfo.name,
      teamId: defaultTeam.id,
      team: defaultTeam.name,
    });

    for (const b of backlogInfo) {
      backlogLevelsArray.push(BacklogEntity.create(b));
    }

    backlogLevelsArray.sort((a, b) => {
      if (a.rank > b.rank) {
        return -1;
      } else if (a.rank < b.rank) {
        return 1;
      } else {
        return 0;
      }
    });

    return backlogLevelsArray;
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
    if (node === undefined) {
      return;
    }

    if (node.isTopLevelNode() && node.data) {
      node.data.top = true;
    }

    for (const child of node.children) {
      ProjectRoadmapService.traverse(child, result);
    }

    if (node.data) {
      result.push(node.data);
    }
  }

  /**
   * This Function calculates the progress for all work items using recursion.
   *
   * @param roadmapTree the tree structure of the work items.
   * @returns ordered tasks with a populated progress percent.
   */
  static async updateWorkItemProgress(
    roadmapTree: SearchResultEntity<ProjectRoadmapTaskEntity, number>
  ): Promise<ProjectRoadmapTaskEntity[]> {
    const result: ProjectRoadmapTaskEntity[] = [];
    let workItem: ProjectRoadmapTaskEntity;
    let calculatedProgress: number;
    const iterationCache = await ProjectCacheService.getProjectIterations();
    const workItemTypes = await WorkItemProcessService.getCachedWorkItemTypes();
    let workItemType: WorkItemTypeEntity | undefined;

    ProjectRoadmapService.traverse(roadmapTree, result);

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
          workItemType = workItemTypes.get(workItem.type);
          if (
            workItemType &&
            (workItemType.stateCompleted.indexOf(workItem.state) > -1 ||
              workItemType.stateRemoved.indexOf(workItem.state) > -1)
          ) {
            calculatedProgress = 100;
          }
        } else {
          currentNode.children.forEach((child) => {
            if (child.data) {
              if (
                workItem.start === undefined ||
                (child.data.start && child.data.start < workItem.start)
              ) {
                workItem.start = child.data.start;
                workItem.calculatedStart = true;
              }

              if (
                workItem.end === undefined ||
                (child.data.end && child.data.end > workItem.end)
              ) {
                workItem.end = child.data.end;
                workItem.calculatedEnd = true;
              }

              // If no progress set, set to 0
              calculatedProgress += child.data.progress
                ? child.data.progress
                : 0;
            }
          });

          calculatedProgress /= currentNode.totalChildren();
        }

        workItem.progress = calculatedProgress;

        // At this point, if start and end date are still null, try and defer it to the iteation path.
        if (workItem.start === undefined) {
          workItem.start = iterationCache.get(
            workItem.iterationPath
          )?.attributes?.startDate;

          if (workItem.start) {
            workItem.calculatedStart = false;
          }
        }

        if (workItem.end === undefined) {
          workItem.end = iterationCache.get(
            workItem.iterationPath
          )?.attributes?.finishDate;

          if (workItem.end) {
            workItem.calculatedEnd = false;
          }
        }
      }
    }

    return result;
  }

  /**
   * Update the parent relationships of work items.
   *
   * @param roadmapTree the tree of search results.
   * @param projectRoadmaps the current working roadmap data.
   */
  private static associateWorkItemsToParents(
    roadmapTree: SearchResultEntity<ProjectRoadmapTaskEntity, number>,
    projectRoadmaps: ProjectRoadmapTaskEntity[]
  ): void {
    let currentNode: TreeNode<ProjectRoadmapTaskEntity, number> | undefined;
    let currentParentId: number;

    for (let entry of projectRoadmaps) {
      currentParentId = entry.parent;
      while (currentParentId !== 0 && currentParentId !== undefined) {
        currentNode = roadmapTree.nodeMap?.get(currentParentId);
        if (currentNode && currentNode.data) {
          currentParentId = currentNode.data.parent;
        } else {
          currentParentId = 0;
        }
      }
    }
  }

  /**
   * Push on the stack items that have data in a preorder visit where the top of the stack is what we visit first.
   *
   * @param roadmapTree the search result tree.
   * @param stack the current stack.
   */
  private static pushPreorderStackOfDataNodes(
    roadmapTree: TreeNode<ProjectRoadmapTaskEntity, number>,
    stack: ProjectRoadmapTaskEntity[]
  ): void {
    let currentNode: TreeNode<ProjectRoadmapTaskEntity, number> | undefined;

    // We will now walk the tree that is produced - Preorder walk.
    if (!roadmapTree.isEmpty()) {
      // Push all children on the stack only if data exists.
      for (let x = roadmapTree.children.length - 1; x >= 0; x--) {
        currentNode = roadmapTree.children[x];
        if (currentNode && currentNode.data) {
          stack.push(currentNode.data);
        }
      }
    }
  }

  /**
   * Create the gantt chart
   *
   * @param asOf date to pull data from or undefined for today.
   * @param modifiedAfter date of when last change.
   * @returns the tasks for the gantt chart
   */
  static async createGantt(
    modifiedAfter?: Date,
    asOf?: Date
  ): Promise<ProjectRoadmapTaskEntity[]> {
    const roadmapTree = await this.getRoadmaps(modifiedAfter, asOf);
    const projectRoadmaps: ProjectRoadmapTaskEntity[] = [];
    const stack: ProjectRoadmapTaskEntity[] = [];
    let currentData: ProjectRoadmapTaskEntity | undefined;
    let currentNode: TreeNode<ProjectRoadmapTaskEntity, number> | undefined;

    // Add all the projects.
    ProjectRoadmapService.pushPreorderStackOfDataNodes(roadmapTree, stack);

    // Loop over the stack untl we finish walking the tree. - Preorder
    while (stack.length > 0) {
      currentData = stack.pop();
      if (currentData) {
        projectRoadmaps.push(currentData);
        currentNode = roadmapTree.nodeMap?.get(currentData.id);
        if (currentNode) {
          // Add all children.
          ProjectRoadmapService.pushPreorderStackOfDataNodes(
            currentNode,
            stack
          );
        }
      }
    }

    ProjectRoadmapService.associateWorkItemsToParents(
      roadmapTree,
      projectRoadmaps
    );
    await ProjectRoadmapService.updateWorkItemProgress(roadmapTree);

    return projectRoadmaps;
  }
}
