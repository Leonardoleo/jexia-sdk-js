// Node application
import { dataOperations, jexiaClient } from "jexia-sdk-js/node";

// Optionally use interfaces to type your datasets,
// then you will have better auto complete and type cheeking
interface Post {
  title: string;
  published: boolean;
}

// Initialize DataOperationsModule
const dataModule = dataOperations();
const credentials = {
  projectID: "<your-project-id>",
  zone: "<your-project-zone>",
  key: "<your-project-api-key>",
  secret: "<your-project-api-secret>",
};

// Initialize Client and pass DataOperationsModule to it.
jexiaClient().init(credentials, dataModule);

// Use your data module with an optional generic type
dataModule.dataset<Post>("posts")
  .select()
  .execute()
  .then((records) => {
    console.log(records);
    process.exit();
  })
  .catch((error) => {
    // there was a problem retrieving records
    console.log(error);
    process.exit();
  });
