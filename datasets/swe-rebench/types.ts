export interface SweRebenchInstance {
  instance_id: string;
  repo: string;
  base_commit: string;
  patch: string;
  test_patch: string;
  image_name: string;
  language: string;
}
