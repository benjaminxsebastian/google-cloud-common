# [Google Cloud Common](https://github.com/benjaminxsebastian/google-cloud-common)

This library provides some common functionality used in every Google Cloud project, such as enabling APIs and validating that billing has been set up for the project.

---

## Installing the google-cloud-common Library

```console
npm i @benjamin.x.sebastian/google-cloud-common
```

---

## Properties and Methods in the google-cloud-common Library

### Properties

```typescript
/**
 * @returns {ServiceUsageClient} The ServiceUsageClient object used by this
 *      project.
 */
export const serviceUsageClient = new ServiceUsageClient();
```

```typescript
/**
 * @returns {string} The 'cloudbilling.googleapis.com' service.
 */
export const CLOUD_BILLING_API = 'cloudbilling.googleapis.com';
```

### Methods

```typescript
/**
 * getProjectIdentifier
 *
 * Gets the project identifier.
 *
 * @returns {string} The project identifier.
 */
export declare function getProjectIdentifier(): Promise<string>;
```

```typescript
/**
 * enableServiceForProject
 *
 * Enables the specified service for the project.
 *
 * @param {string} serviceName The service to enable.
 * @param {string} projectIdentifier The project identifier, if defined.
 *      Otherwise, the projectIdentifier will be obtained.
 */
export declare function enableServiceForProject(serviceName: string, projectIdentifier?: string): Promise<void>;
```

```typescript
/**
 * initializeServiceAPIForProject
 *
 * Initializes the specified service for the project and returns its API
 * library.
 *
 * @param {string} serviceName The service to enable.
 * @param {any} api The api to initialize.
 * @param {string} projectIdentifier The project identifier, if defined.
 *      Otherwise, the projectIdentifier will be obtained.
 *
 * @returns {API} The project identifier.
 */
export async function initializeServiceAPIForProject<APILibrary>(
    serviceName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api: any,
    projectIdentifier?: string
): Promise<APILibrary> {
```

```typescript
/**
 * validateCloudBillingAccount
 *
 * Validates the cloud billing account.
 *
 * @param {CloudBillingClient} cloudBillingClient The CloudBillingClient object
 *      used to perform the operations. It will be initialized if not defined.
 */
export declare function validateCloudBillingAccount(cloudBillingClient?: CloudBillingClient): Promise<void>;
```

```typescript
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
export declare function initializeGoogleCloudCommon(projectIdentifier?: string): Promise<CloudBillingClient>;

```

---

## License

Apache Version 2.0

See [LICENSE](https://github.com/benjaminxsebastian/google-cloud-common/blob/main/LICENSE)
