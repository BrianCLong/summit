export interface Transform {
  id: string;
  name: string;
  description: string;
  inputTypes: string[];
  outputTypes: string[];
}

export class TransformIndex {
  private transforms: Transform[] = [];

  constructor(initialTransforms: Transform[] = []) {
    this.transforms = initialTransforms;
  }

  addTransforms(transforms: Transform[]) {
    this.transforms = [...this.transforms, ...transforms];
  }

  setTransforms(transforms: Transform[]) {
    this.transforms = transforms;
  }

  search(query: string): Transform[] {
    if (!query) return this.transforms;
    const lowerQuery = query.toLowerCase();
    return this.transforms.filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.inputTypes.some((type) => type.toLowerCase().includes(lowerQuery))
    );
  }
}

export const transformIndex = new TransformIndex();
