# Intelligence & Vertical Software Bundle — Start-Over Edition

Generated: 2025-09-07 23:25:11

This bundle includes:

- data/intel_tools_matrix.csv (and .json): ATS-optimized matrix across SIGINT/COMINT/ELINT/FISINT, GEOINT/IMINT/SAR, OSINT/IO, CYBINT/DFIR/EDR/SIEM, FININT/AML/KYC, HUMINT/CRIMINT, CI, PSYOPS/IO (defensive analytics).
- data/vertical_software.csv: Home • Finance • Travel • Shopping • Academic • Sports • Library coverage.
- data/entities_master.csv: Name | When | Allegiance | Agency/Organization/Service (+ sources).
- ui/index.html + ui/styles.css: minimal nav scaffold for Home / Finance / Travel / Shopping / Academic / Sports / Library.
- README.md: this file.

Schema (ATS-ready):
Name, Discipline, Subdiscipline, Vendor, Type, Category, Description, Granular_Capabilities, Core_Features, Primary_Functions, Common_Use_Cases, Data_Inputs, Data_Outputs, Interfaces_APIs, Deployment_Options, Scale_Performance, Integrations, Compliance_Standards, License, Known_Buyers_Public, Contract_Vehicles, Export_Controls, Sources_Official, Sources_RFP_RFI, Sources_Academic, Sources_Patents, Notes

Notes:

- Every tool lists an official source in Sources_Official. Columns for RFP/RFI, Academic, Patents are present for due diligence expansion.
- No operational “how-to” tradecraft is included. This is a planning/selection matrix.
- You can extend the CSVs and re-zip by re-running this script.
