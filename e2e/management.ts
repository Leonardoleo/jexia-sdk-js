// tslint:disable:max-classes-per-file
import chalk from "chalk";
import { default as fetch, Response } from "node-fetch";
import { api } from "./config";

export type FieldType = "boolean" | "date" | "datetime" | "float" | "integer" | "json" | "string" | "uuid";

export interface IFieldConstraints {
  type: "required" | "numeric" | "alpha" | "alphanumeric" | "uppercase" | "lowercase" | "min" | "max" | "min_length"
  | "max_length" | "regexp";
  value?: "true" | "false" | number | string;
}

export interface ISetField {
  name: string;
  type: FieldType;
  constraints?: IFieldConstraints[];
}

interface IResource {
  id: string;
}

interface IFlow {
  name: string;
  gateway_id: string;
  subject: string;
  templates: any[];
  event_type: "AfterPasswordResetRequest";
}

/* Get AWS credentials for fileset */
const { AWS_KEY, AWS_SECRET, AWS_BUCKET } = process.env;

/**
 * Print HTTP error in a awesome human-readable way
 */
export class ManagementError extends Error {

  public static formatError(res: Response, req: any): string {
    const title = chalk.yellow("There is an error happened during server request: ") +
      chalk.redBright(res.status.toString() + " " + res.statusText);
    const lane = new Array(title.length).fill("-").join("");
    return [
      title,
      chalk.gray(lane),
      chalk.cyan("url: ") + chalk.yellowBright(res.url),
      chalk.cyan("Response body:") + " " + chalk.redBright(res.body.read() as string),
      chalk.gray(lane),
      chalk.cyan("Request:") + " " + chalk.redBright(JSON.stringify(req)),
    ].join("\n");
  }

  constructor(private response: Response, private request: any) {
    super();
    this.message = ManagementError.formatError(this.response, this.request);
  }
}

export class Management {

  public static checkStatus(res: Response, init: any) {
    if (res.ok) {
      return res;
    } else {
      throw new ManagementError(res, init);
    }
  }

  private token: string;

  private get headers() {
    return {
      "Authorization": `Bearer ${this.token}`,
      "Content-Type": "application/json"
    };
  }

  public login(): Promise<any> {
    return this.fetch(api.login, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: process.env.E2E_EMAIL,
        password: process.env.E2E_PASSWORD,
        recaptchaToken: process.env.RECAPTCHA_TOKEN,
      })
    }).then((res: any) => res.json())
      .then((tokens: { access_token: string, refresh_token: string}) => {
        this.token = tokens.access_token;
      });
  }

  public createDataset(name: string): Promise<any> {
    return this.fetch(api.dataset.create, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ name })
    })
      .then((response: Response) => response.json());
  }

  public deleteDataset(id: string): Promise<any> {
    return this.fetch(api.dataset.delete.replace("{dataset_id}", id), {
      method: "DELETE",
      headers: this.headers
    });
  }

  public createDatasetField(datasetId: string, field: ISetField): Promise<any> {
    return this.fetch(api.dataset.field.create.replace("{dataset_id}", datasetId), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(field)
    })
      .then((response: Response) => response.json());
  }

  public createChannel(name: string, history = false): Promise<{id: string; name: string}> {
    return this.fetch(api.channel.create, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ name, properties: { store_messages: history } }),
    })
      .then((response: Response) => response.json());
  }

  public deleteChannel(id: string): Promise<void> {
    return this.fetch(api.channel.delete.replace("{channel_id}", id), {
      method: "DELETE",
      headers: this.headers
    })
      .then((response: Response) => response.json());
  }

  public createApiKey(): Promise<any> {
    return this.fetch(api.apikey.create, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ description: "test API key" })
    })
      .then((response: Response) => response.json());
  }

  public deleteApiKey(key: string): Promise<any> {
    return this.fetch(api.apikey.delete.replace("{key}", key), {
      method: "DELETE",
      headers: this.headers
    });
  }

  public createPolicy(resources: Array<{ id: string }>, keys: string[]): Promise<any> {
    return this.fetch(api.policy.create, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        description: "test_policy",
        actions: { read: [], create: [], update: [], delete: [] },
        subjects: keys,
        resources: resources.map((resource) => resource.id),
      })
    })
      .then((response: Response) => response.json());
  }

  public deletePolicy(id: string): Promise<any> {
    return this.fetch(api.policy.delete.replace("{policy_id}", id), {
      method: "DELETE",
      headers: this.headers
    });
  }

  public createFileset(name: string): Promise<any> {
    return this.fetch(api.fileset.create, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        name,
        provider: {
          id: "aws-s3",
          name: "AWS",
          options: [
            { key: "key", value: AWS_KEY },
            { key: "secret", value: AWS_SECRET },
            { key: "bucket", value: AWS_BUCKET },
          ]
        }
      })
    })
      .then((response: Response) => response.json());
  }

  public deleteFileset(id: string): Promise<any> {
    return this.fetch(api.fileset.delete.replace("{fileset_id}", id), {
      method: "DELETE",
      headers: this.headers
    });
  }

  public createFilesetField(filesetId: string, field: ISetField): Promise<any> {
    return this.fetch(api.fileset.field.create.replace("{fileset_id}", filesetId), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(field)
    })
      .then((response: Response) => response.json());
  }

  public createRelation(from: IResource, to: IResource, fromCardinality = "ONE", toCardinality = "MANY") {
    return this.fetch(api.dataset.relation, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        from_resource: {
          namespace: "mimir",
          resource_id: from.id
        },
        to_resource: {
          namespace: "mimir",
          resource_id: to.id
        },
        type: {
          from_cardinality: fromCardinality,
          to_cardinality: toCardinality,
        }
      })
    })
      .then((response: Response) => response.json());
  }

  public deleteRelation(id: string): Promise<any> {
    return this.fetch(`${api.dataset.relation}/${id}`, {
      method: "DELETE",
      headers: this.headers,
    });
  }

  public getUMSSchemaId(): Promise<string> {
    return this.fetch(api.ums.schema, {
      method: "GET",
      headers: this.headers,
    })
      .then((response: Response) => response.json())
      .then(([{ id }]) => id);
  }

  public createGateway(name: string, settings: any, type = "SMTP"): Promise<IResource> {
    return this.fetch(api.gateways.create, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ name, type, settings }),
    })
      .then((response: Response) => response.json());
  }

  public deleteGateway(id: string): Promise<void> {
    return this.fetch(api.gateways.delete.replace("{gateway_id}", id), {
      method: "DELETE",
      headers: this.headers
    })
      .then((response: Response) => response.json());
  }

  public createFlow(action: IFlow): Promise<IResource> {
    return this.fetch(api.flows.create, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(action),
    })
      .then((response: Response) => response.json());
  }

  public deleteFlow(id: string): Promise<void> {
    return this.fetch(api.flows.delete.replace("{flow_id}", id), {
      method: "DELETE",
      headers: this.headers
    })
      .then((response: Response) => response.json());
  }

  private fetch(url: string, init: any = {}): Promise<Response> {
    return fetch(url, init).then((res) => Management.checkStatus(res, init));
  }
}
