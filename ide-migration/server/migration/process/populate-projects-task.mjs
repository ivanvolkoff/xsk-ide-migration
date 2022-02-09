import { process } from "@dirigible/bpm";
import { MigrationService } from "../../../../../../Downloads/ide-migration 7/server/migration/api/migration-service.mjs";
import { TrackService } from "../../../../../../Downloads/ide-migration 7/server/migration/api/track-service.mjs";

export class PopulateProjectsTask {
    execution = process.getExecutionContext();
    trackService = new TrackService();

    run() {
        try {
            process.setVariable(this.execution.getId(), "migrationState", "POPULATING_PROJECTS");
            this.trackService.updateMigrationStatus("POPULATING PROJECTS");
            const userDataJson = process.getVariable(this.execution.getId(), "userData");
            const userData = JSON.parse(userDataJson);

            const migrationService = new MigrationService();
            const workspace = userData.workspace;
            console.log(workspace);
            console.log("1")
            for (const deliveryUnit of userData.du) {
                const localFiles = deliveryUnit.locals;
                if (!(localFiles && localFiles.length > 0)) {
                    throw "Delivery unit is empty";
                }
                            console.log("2")

                migrationService.addFilesWithoutGenerated(userData, workspace, localFiles);
                            console.log("3")

                migrationService.addGeneratedFiles(userData, deliveryUnit, workspace, localFiles);
                            console.log("4")

                migrationService.modifyFiles(workspace, localFiles);
            }
            process.setVariable(this.execution.getId(), "migrationState", "MIGRATION_EXECUTED");
            this.trackService.updateMigrationStatus("MIGRATION EXECUTED");
        } catch (e) {
            console.log("POPULATING_PROJECTS failed with error:");
            console.log(e.message);
            console.log(e.stack);
            process.setVariable(this.execution.getId(), "migrationState", "POPULATING_PROJECTS_FAILED");
            this.trackService.updateMigrationStatus("POPULATING PROJECTS FAILED");
            process.setVariable(
                this.execution.getId(),
                "POPULATING_PROJECTS_FAILED_REASON",
                e.toString()
            );
        }
    }
}
