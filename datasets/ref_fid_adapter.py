class RefFidDataset:
    """
    Adapter for generalized reference-fidelity benchmark datasets.
    Provides multi-domain reference-target pairs.
    """

    def __init__(self, data=None):
        if data is None:
            self.data = []
        else:
            self.data = data

    def add_sample(self, target_image: str, reference_image: str, mask: str = None, domain: str = "general"):
        """
        Adds a sample dictionary matching the required format.
        """
        sample = {
            "target_image": target_image,
            "reference_image": reference_image,
            "mask": mask,
            "domain": domain
        }
        self.data.append(sample)

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        return self.data[idx]
