import { BacklogLevelConfiguration } from "azure-devops-extension-api/Work";

export class BacklogEntity {
    /**
     * Higher ranks are above lower ranks in the tree.
     */
    rank:number = 0;

    /**
     * The name of the backlog level.
     */
    name:string = "";

    /**
     * The work items that are in this backlog.
     */
    workItemTypes: string[] = [];

    /**
     * Create the backlog entity.
     *
     * @param b the backlog info
     */
    static create(b: BacklogLevelConfiguration):BacklogEntity {
        const instance = new BacklogEntity();
        instance.name = b.name;
        instance.rank = b.rank;

        for (const w of b.workItemTypes) {
            instance.workItemTypes.push(w.name);
        }

        return instance;
    }
}