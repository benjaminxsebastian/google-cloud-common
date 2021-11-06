/*
 * Created on Mon Oct 11 2021
 *
 * Copyright [2021] [Benjamin Sebastian]
 *
 *Licensed under the Apache License, Version 2.0 (the "License");
 *you may not use this file except in compliance with the License.
 *You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *Unless required by applicable law or agreed to in writing, software
 *distributed under the License is distributed on an "AS IS" BASIS,
 *WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *See the License for the specific language governing permissions and
 *limitations under the License.
 *
 */

import {
    protos as billingProtos,
    CloudBillingClient
} from '@google-cloud/billing';
import {
    protos as serviceUsageProtos,
    ServiceUsageClient
} from '@google-cloud/service-usage';

/**
 * @returns {ServiceUsageClient} The ServiceUsageClient object used by this
 *      project.
 */
export const serviceUsageClient = new ServiceUsageClient();

/**
 * @returns {string} The 'cloudbilling.googleapis.com' service.
 */
export const CLOUD_BILLING_API = 'cloudbilling.googleapis.com';

/**
 * getProjectIdentifier
 *
 * Gets the project identifier.
 *
 * @returns {string} The project identifier.
 */
export async function getProjectIdentifier(): Promise<string> {
    const projectIdentifier = await serviceUsageClient.getProjectId();

    if (!projectIdentifier) {
        throw new Error('The project identifier could NOT be obtained!');
    }

    return projectIdentifier;
}

/**
 * enableServiceForProject
 *
 * Enables the specified service for the project.
 *
 * @param {string} serviceName The service to enable.
 * @param {string} projectIdentifier The project identifier, if defined.
 *      Otherwise, the projectIdentifier will be obtained.
 */
export async function enableServiceForProject(
    serviceName: string,
    projectIdentifier?: string
): Promise<void> {
    if (!projectIdentifier) {
        projectIdentifier = await getProjectIdentifier();
    }
    const enableServiceRequest =
        new serviceUsageProtos.google.api.serviceusage.v1.EnableServiceRequest();

    enableServiceRequest.name = `projects/${projectIdentifier}/services/${serviceName}`;
    const enableServiceResponseOperation =
        await serviceUsageClient.enableService(enableServiceRequest);
    const enableServiceResponse =
        await enableServiceResponseOperation[0].promise();

    if (enableServiceResponse[0].service) {
        if (
            !enableServiceResponse[0].service.name ||
            enableServiceResponse[0].service.name
                .toLowerCase()
                .endsWith(serviceName.toLowerCase()) !== true
        ) {
            throw new Error(
                `The service name in enableServiceResponse: ${enableServiceResponse[0].service.name} does NOT match the service name in enableServiceRequest: ${enableServiceRequest.name}!`
            );
        }
        if (
            enableServiceResponse[0].service.state !==
            serviceUsageProtos.google.api.serviceusage.v1.State.ENABLED
        ) {
            throw new Error(
                `The service: ${enableServiceRequest.name} could NOT be enabled successfully. Current state: ${enableServiceResponse[0].service.state}.`
            );
        }
    } else {
        throw new Error(
            `The service: ${enableServiceRequest.name} could NOT be enabled.`
        );
    }
}

/**
 * validateCloudBillingAccount
 *
 * Validates the cloud billing account.
 *
 * @param {CloudBillingClient} cloudBillingClient The CloudBillingClient object
 *      used to perform the operations. It will be initialized if not defined.
 */
export async function validateCloudBillingAccount(
    cloudBillingClient?: CloudBillingClient
): Promise<void> {
    if (!cloudBillingClient) {
        cloudBillingClient = new CloudBillingClient();
    }
    const listBillingAccountsRequest =
        new billingProtos.google.cloud.billing.v1.ListBillingAccountsRequest();

    listBillingAccountsRequest.pageSize = 1;
    const listBillingAccountsResponse =
        await cloudBillingClient.listBillingAccounts(
            listBillingAccountsRequest
        );
    let masterCloudBillingAccountExists = false;

    if (
        listBillingAccountsResponse[0] &&
        listBillingAccountsResponse[0].length > 0
    ) {
        for (const billingAccount of listBillingAccountsResponse[0]) {
            // Master billing accounts won't have the 'masterBillingAccount'
            // attribute set on them.
            if (billingAccount.open && !billingAccount.masterBillingAccount) {
                masterCloudBillingAccountExists = true;

                break;
            }
        }
    }
    if (!masterCloudBillingAccountExists) {
        throw new Error(
            'Could not locate any master cloud billing accounts. Please follow the instructions on https://cloud.google.com/billing/docs/how-to/manage-billing-account to create a master cloud billing account.'
        );
    }
}

/**
 * initializeGoogleCloudCommon
 *
 * Initializes the common functionality used in Google Cloud.
 *
 * @param {string} projectIdentifier The project identifier, if defined.
 *      Otherwise, the projectIdentifier will be obtained.
 *
 * @returns {CloudBillingClient} The CloudBillingClient object used to perform
 *      the operations.
 */
export async function initializeGoogleCloudCommon(
    projectIdentifier?: string
): Promise<CloudBillingClient> {
    await enableServiceForProject(CLOUD_BILLING_API, projectIdentifier);
    const cloudBillingClient = new CloudBillingClient();

    await validateCloudBillingAccount(cloudBillingClient);

    return cloudBillingClient;
}
