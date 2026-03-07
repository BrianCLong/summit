export interface SweRebenchInstance {
  instance_id: string;
  repo: string;
  base_commit: string;
  image_name: string;
  patch?: string;
  test_patch?: string;
  language?: string;
  fail_to_pass?: string[];
  pass_to_pass?: string[];
  [key: string]: unknown;
}

export interface SweRebenchLoadOptions {
  maxInstances?: number;
  languages?: string[];
}
