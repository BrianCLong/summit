import { gql } from "@apollo/client";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  Date: { input: any; output: any };
  DateTime: { input: any; output: any };
  JSON: { input: any; output: any };
  Void: { input: any; output: any };
};

export type LaunchRunInput = {
  params?: InputMaybe<Scalars["JSON"]["input"]>;
  runbookId: Scalars["ID"]["input"];
  tenantId: Scalars["String"]["input"];
};

export type Mutation = {
  __typename?: "Mutation";
  abortRun: Run;
  launchRun: Run;
};

export type MutationAbortRunArgs = {
  id: Scalars["ID"]["input"];
};

export type MutationLaunchRunArgs = {
  input: LaunchRunInput;
};

export type Query = {
  __typename?: "Query";
  run?: Maybe<Run>;
  runbooks: Array<Runbook>;
};

export type QueryRunArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryRunbooksArgs = {
  after?: InputMaybe<Scalars["ID"]["input"]>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
};

export type Run = {
  __typename?: "Run";
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  runbookId: Scalars["ID"]["output"];
  state: RunState;
  tenantId: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export enum RunState {
  Aborted = "ABORTED",
  Failed = "FAILED",
  Leased = "LEASED",
  Queued = "QUEUED",
  Running = "RUNNING",
  Succeeded = "SUCCEEDED",
  TimedOut = "TIMED_OUT",
}

export type Runbook = {
  __typename?: "Runbook";
  createdAt: Scalars["DateTime"]["output"];
  dag: Scalars["JSON"]["output"];
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
  version: Scalars["String"]["output"];
};
