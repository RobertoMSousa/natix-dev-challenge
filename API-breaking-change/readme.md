

# Handling API Breaking Changes 


Imagine you’re designing and maintaining an internal or public-facing **Weather API**. A basic version of the response looks like:

```
{
  "Weather": [
    { "hour": 0, "temperature": "18", "condition": "Clear" },
    { "hour": 1, "temperature": "17", "condition": "Clear" },
    ...
    { "hour": 23, "temperature": "16", "condition": "Cloudy" }
 ]
}
```

 Assumming this is the first published contract is consumed by multiple frontend apps already we need to introduced a change. please answer to these questions:
 

### 1 What Is a Breaking Change?

A breaking change in an API is any modification that can cause existing clients or consumers of the API to fail if they are not updated. Here are three examples based on our weather service project:
	•	Renaming a Field: For example, changing the temperature field to temp would break any frontend that still expects the old temperature field.
	•	Changing Data Types: If the temperature field, which was previously a string (like "18"), is changed to a number (like 18), it could cause issues for clients that don’t handle the new format.
	•	Changing the City Autocomplete Data: For example, if we alter the structure of the city results for the autocomplete feature, such as nesting city data differently or changing the field names for city attributes, it would break frontends that rely on the old format.

### 2 Coordinating Across Multiple Frontends

Coordinating API schema changes across multiple frontends, especially when they update at different intervals, requires a careful approach. 
One effective method is to implement API versioning, where older versions of the API remain available for some time (example 1 year) while a new version is introduced. This gives frontend teams the time to migrate to the updated version without disrupting their existing workflows.

In addition to versioning, feature flags offer another layer of flexibility. By using feature flags, you can enable or disable specific features for different groups of users. That means that premium features can be rolled out to paid clients first, while basic features remain available to free-tier users. 
This approach not only ensures a smooth transition when rolling out new features but also allows for more personalised user experiences. By combining versioning with feature flags, we can effectively manage multiple frontends and user tiers, providing a more robust and flexible experience to all the frontends.

### 3 How to Catch Breaking Changes During Development

To catch breaking changes during development, it’s crucial to use a combination of automated testing and continuous integration pipelines.
Automated tests, including unit, integration, and contract tests, help ensure that any changes to the API do not break existing functionality.
Contract testing, in particular, validates that the API meets the expectations of its clients, ensuring compatibility.
Additionally, maintaining clear communication and documentation helps keep all teams aligned. 
Finally, using staging environments for end-to-end testing and QA ensures that the entire system works seamlessly before changes go live.

### 4 Policy for Releasing Changes

Timeline for developing and releasing a new feature:
	1.	Development Phase: Start by developing the new feature on a dedicated feature branch. Implement and test the feature locally to ensure it’s working as expected.
	2.	Code Review: Once the feature is ready, create a pull request and have the code reviewed by your peers. Incorporate feedback and make any necessary adjustments.
	3.	Merge to Dev Branch: After approval, merge the feature branch into the development (dev) branch. This branch is typically used for integration and testing.
	4.	Staging Environment: Deploy the updated dev branch to the staging environment. This environment should mirror production and is used for more extensive testing.
	5.	Testing on Staging: Perform thorough testing on the staging environment. This can include automated tests, manual testing, and user acceptance testing to ensure everything is working as intended.
  6.  Merge Staging: Once testing is successful merge Staging into Main
	7.	Blue-Green Deployment: Deploy the new version to the inactive environment (e.g., the “green” environment if “blue” is currently live).
	8.	Toggle Traffic: Switch user traffic to the new environment. Monitor the deployment closely to ensure everything is running smoothly.
	9.	Rollback Plan: In case any issues arise, you can quickly switch traffic back to the previous environment, ensuring minimal disruption for users.


## 🧪 Acceptance Criteria
- Answer these four questions thoroughly – at least one paragraph each, maximum half a page.
- Provide practical examples from your own experience. Don’t just rely on ChatGPT’s first suggestion — dig deeper!





