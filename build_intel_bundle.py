# build_intel_bundle.py
# Generates intel-startover-bundle.zip with ATS-optimized matrices + simple UI.
# Works offline. Requires Python 3.8+.

import os, csv, json, zipfile, datetime, textwrap

TS = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

BASE = "intel-startover-bundle"
DATA = os.path.join(BASE, "data")
UI = os.path.join(BASE, "ui")
os.makedirs(DATA, exist_ok=True)
os.makedirs(UI, exist_ok=True)

def write_csv(path, header, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in rows:
            w.writerow(r)

# ---------- MASTER MATRIX ----------
matrix_header = [
    "Name","Discipline","Subdiscipline","Vendor","Type","Category","Description",
    "Granular_Capabilities","Core_Features","Primary_Functions","Common_Use_Cases",
    "Data_Inputs","Data_Outputs","Interfaces_APIs","Deployment_Options",
    "Scale_Performance","Integrations","Compliance_Standards","License",
    "Known_Buyers_Public","Contract_Vehicles","Export_Controls",
    "Sources_Official","Sources_RFP_RFI","Sources_Academic","Sources_Patents","Notes"
]

# Curated core set across all disciplines (official links only; enrich RFP/Patent later)
tools = [
    # SIGINT / COMINT / ELINT / FISINT
    ("GNU Radio","SIGINT","SDR/DSP","GNU Radio Project","Open Source","Framework",
     "Modular SDR/DSP framework for prototyping receivers/decoders.",
     "IQ capture;Flowgraphs;Demodulation;Filtering;Scripting","Blocks;Scheduler;UHD;SoapySDR",
     "Design signal chains;Prototype demodulators","Rapid SDR prototyping;Education;Lab ops",
     "IQ files;Live SDR streams","Decoded streams;Measurements;Plots",
     "Python;C++;GR-OSMOSDR;UHD","Desktop/Server",
     "Scales with cores;Cluster via messaging","RTL-SDR;HackRF;BladeRF;LimeSDR","", "GPLv3",
     "Academia;Labs","", "","","https://www.gnuradio.org","","",""),

    ("Gqrx","SIGINT","Receiver UI","Open-source","Open Source","Application",
     "SDR receiver with spectrum/waterfall and demodulators.",
     "Spectrum;Waterfall;AM/FM/SSB;Recording","Audio demod;Bookmarking",
     "Live interception;Band survey","Spectrum survey;Monitoring",
     "RTL-TCP;SoapySDR","Audio;IQ recordings","Hamlib;SoapySDR","Desktop",
     "Lightweight","RTL-SDR;HackRF;LimeSDR","", "GPLv3",
     "Hobby;Research","", "","","https://gqrx.dk","","",""),

    ("SDRAngel","SIGINT","Receiver/Transceiver","Open-source","Open Source","Application",
     "Multi-platform SDR Rx/Tx with plugin ecosystem.",
     "Multi-channel;Plugins;Tx/Rx;Recording","Device plugins;Modems",
     "Live operations;Tx tests","Spectrum ops;Telemetry decode adjunct",
     "SDR devices;RTL-TCP","Audio;IQ;Decoded streams","SoapySDR","Desktop",
     "Depends on hardware","RTL-SDR;HackRF;BladeRF;LimeSDR","", "GPLv3",
     "Hobby;Research","", "","","https://www.sdrangel.org/","","",""),

    ("SigDigger","SIGINT","Signal Analysis","BatchDrake","Open Source","Application",
     "Lightweight signal analyzer for unknown signal hunting.",
     "Spectrogram;Bookmarks;Measurements","Quicklook analysis",
     "Unknown signal triage","Hunt;Annotate;Export",
     "IQ streams/files","Annotations;Screenshots","SoapySDR","Desktop",
     "Lightweight","RTL-SDR;HackRF;LimeSDR","", "GPLv3",
     "Researchers","", "","","https://batchdrake.github.io/SigDigger/","","",""),

    ("dump1090","FISINT","ADS-B/Mode S","Community","Open Source","Decoder",
     "ADS-B/Mode S decoder for air traffic tracking.",
     "1090MHz decode;MLAT;Maps","Web UI;Feeds",
     "Air picture;Flight tracking","Situational awareness;OSINT",
     "1090MHz frames","Tracks;Positions;CSV","Beast;SBS","Desktop/Server",
     "High throughput on modest CPU","RTL-SDR","", "BSD/MIT",
     "OSINT;ATC hobby","", "","","https://github.com/antirez/dump1090","","",""),

    ("gr-gsm","COMINT","GSM Research","Community","Open Source","Blocks/Decoder",
     "GSM receiver/decoder blocks for GNU Radio.",
     "ARFCN scan;GSM bursts;Decode","CLI tooling;Wireshark taps",
     "GSM research;Training","Educational;Analysis",
     "IQ;GSM bursts","Decoded frames;PCAP","GNU Radio;Wireshark","Desktop",
     "Build-time dependent","RTL-SDR;BladeRF;LimeSDR","", "GPLv3",
     "Academia","", "","","https://github.com/ptrkrysik/gr-gsm","","",""),

    ("SatDump","FISINT","EO/SAT decoding","SatDump Project","Open Source","Decoder",
     "Multi-satellite EO downlink decoder/processor.",
     "LRPT/HRPT;Meteor;NOAA;GOES","Image products;Telemetry",
     "Earth observation downlink;Weather","Imagery;Telemetry products",
     "Baseband IQ;RTL-SDR;Airspy","GeoTIFF;PNGs;HDF","Plugins","Desktop",
     "GPU optional acceleration","RTL-SDR;Airspy;SDRplay","", "GPLv3",
     "Hobby;Research","", "","","https://github.com/SatDump/SatDump","","",""),

    ("goestools","FISINT","GOES HRIT/LRIT","GOES Tools","Open Source","Decoder",
     "GOES HRIT/LRIT weather satellite receiver tools.",
     "Viterbi;Packetization;Imaging","CLI;Demux",
     "Weather imagery downlink","Imagery;Alerts",
     "RF baseband","Images;Text","", "Desktop",
     "CPU dependent","RTL-SDR;Airspy","", "MIT",
     "Hobby;Research","", "","","https://github.com/pietern/goestools","","",""),

    ("rtl_433","FISINT","ISM Telemetry","Community","Open Source","Decoder",
     "Generic 433/315/868/915 MHz ISM device decoder.",
     "OOK/FSK;Protocol library;MQTT","JSON output;MQTT",
     "Sensor telemetry;IoT signal decode","Device inventory;Alerts",
     "SDR IQ;Live RF","JSON;CSV;MQTT","MQTT;Influx;Grafana","Desktop/Server",
     "Efficient","RTL-SDR","", "GPLv2",
     "Makers;Researchers","", "","","https://github.com/merbanan/rtl_433","","",""),

    ("CRFS RFeye","ELINT","Wide-area RF sensing","CRFS","Commercial","Suite",
     "Networked RF sensors for detect/locate/characterize emitters.",
     "TDOA;DF;Real-time spectrum;Recording","Mission Manager;DeepView",
     "Emitter geo;Spectrum assurance","ELINT;Interference hunting",
     "Wideband RF;IQ","Fixes;Spectra;Recordings","REST;ESRI","Appliance/Server/Cloud",
     "Distributed sensor networks","ArcGIS;Esri stack","", "Commercial",
     "Regulators;Defense (public cases)","Tenders/Direct","Potential export",
     "https://www.crfs.com/software/rfeye-software-suite","","","",""),

    ("Narda SignalShark","ELINT","RTSA/DF","Narda STS","Commercial","Receiver/Analyzer",
     "Real-time spectrum analyzer with DF and mobile/fixed ops.",
     "Real-time FFT;DF;Geotag;Recording","Interference hunting",
     "Emitter search;Characterization","ELINT;Regulatory",
     "RF;Antennas","Plots;Logs;DF bearings","GNSS;APIs","Portable/Fixed",
     "Field rugged","GIS exports","", "Commercial",
     "Regulators;Defense","Direct/Resellers","Potential export",
     "https://www.narda-sts.com/en/products/receivers-/-direction-finders-/-spectrum-analyzers/signalshark/","","","",""),

    ("R&S Radiomonitoring (PR200/EB500/DDF551)","ELINT","Monitoring/DF","Rohde & Schwarz","Commercial","Portfolio",
     "Radiomonitoring receivers and DF systems for COMINT/ELINT.",
     "Wideband Rx;DF;TDOA;Remote control","Stationary/mobile nets",
     "Spectrum surveillance;Emitter geo","ELINT/COMINT",
     "RF;IQ","Recordings;DF lines;Reports","R&S drivers/APIs","Portable/Fixed/Networked",
     "Ruggedized","GIS;Esri","", "Commercial",
     "Defense;Regulatory","Tenders/Direct","Potential export",
     "https://www.rohde-schwarz.com/us/products/radiomonitoring/overview_231098.html","","","https://patents.google.com/patent/US9958525B2",""),

    ("Procitec go2MONITOR","COMINT","Decoder suite","PROCITEC","Commercial","Software",
     "Decoder/classifier suite for voice/data signals.",
     "Auto mode detection;Decoders;Classifiers","go2signals stack",
     "COMINT decoding;Monitoring","Intercept analysis",
     "RF/IQ;Audio","Decoded streams;Logs","APIs;SDK","Desktop/Server",
     "Scales with hardware","SIGINT suites","", "Commercial",
     "Gov/LE;Defense","Tenders/Direct","Potential export",
     "https://www.procitec.de/products/go2monitor.html","","","",""),

    ("Wavecom W-CODE","COMINT","Decoder suite","Wavecom","Commercial","Software",
     "Wideband modem/voice decoder and classifier.",
     "Modem library;Voice tools;Auto-detect","W-Code modules",
     "COMINT decoding","Intercept;Analysis",
     "RF/IQ;Audio","Decoded streams;Logs","APIs","Desktop/Server",
     "Hardware dependent","SIGINT suites","", "Commercial",
     "Gov/LE;Defense","Direct","Potential export",
     "https://www.wavecom.ch/products/w-code/","","","",""),

    ("Krypto500/1000","COMINT","Decoder suite","COMINT Consulting","Commercial","Software",
     "Decoder suite for HF/VHF/UHF modes and signals.",
     "Modem DB;Auto-classify;Recordings","K500/1000 packages",
     "COMINT/ELINT support","Intercept;Analysis",
     "RF/IQ;Audio","Decoded streams;Logs","APIs","Desktop/Server",
     "Hardware dependent","SIGINT suites","", "Commercial",
     "Gov/LE;Defense","Direct","Potential export",
     "https://comintconsulting.com/","","","",""),

    # GEOINT / IMINT / SAR
    ("ArcGIS Pro","GEOINT","GIS","Esri","Commercial","Suite",
     "Enterprise GIS desktop for mapping, analysis, and production.",
     "2D/3D mapping;GeoAI;Toolboxes","ModelBuilder;Add-ins",
     "GEOINT production;Ops mapping","Cartography;Analysis",
     "Vector;Raster;Streams","Maps;Services;Reports","REST;OGC;Python","Desktop",
     "Scales via ArcGIS Enterprise","ArcGIS Enterprise;Server","OGC;STANAG","Commercial",
     "Gov;Defense;LE","GSA/DoD ESI","Dual-use",
     "https://www.esri.com/en-us/arcgis/products/arcgis-pro/overview","","","",""),

    ("ArcGIS Enterprise","GEOINT","GIS Server","Esri","Commercial","Server",
     "On-prem/Cloud web GIS for maps/apps/data/services.",
     "Portal;Services;GeoEvent;Notebook","RBAC;SSO",
     "Ops dashboards;Sharing;Hosting","Web GIS backbone",
     "Geodatabases;Services","Tiles;Feature;Streams","REST;OGC;Python","Server/Cloud",
     "Horizontal scale","Esri apps;3rd-party","OGC;FIPS;FedRAMP","Commercial",
     "Gov;Enterprises","GSA/DoD ESI","Dual-use",
     "https://www.esri.com/en-us/arcgis/products/arcgis-enterprise/overview","","","",""),

    ("QGIS","GEOINT","GIS","QGIS.org","Open Source","Suite",
     "Open-source desktop GIS with rich plugin ecosystem.",
     "Editing;Analysis;Plugins;Print","Processing toolbox",
     "Mapping;Analysis;Training","Cartography;ETL",
     "Vector;Raster","Maps;Reports;Packages","GDAL;Python","Desktop",
     "Project-scale","PostGIS;GeoServer","OGC","GPLv2",
     "Gov;NGO;Research","", "","","https://qgis.org/","","",""),

    ("GDAL/OGR","GEOINT","Geo ETL","OSGeo","Open Source","Library/CLI",
     "De facto geospatial I/O and transformations library.",
     "Format drivers;Warp;Reproject","CLI and APIs",
     "ETL;Pipeline;Conversion","Data engineering",
     "Geo formats","Geo formats","C/C++;Python","Desktop/Server",
     "High throughput","QGIS;ArcGIS;PostGIS","OGC","X/MIT",
     "Everywhere","", "","","https://gdal.org/","","",""),

    ("ENVI","IMINT","Imagery Exploitation","NV5 Geospatial","Commercial","Suite",
     "Imagery exploitation with spectral/SAR toolkits.",
     "Spectral;SAR;Change detect","IDL integration",
     "IMINT;Remote sensing","Exploitation;Products",
     "EO/SAR/IR","Indicies;Products","APIs;IDL","Desktop/Server",
     "Large scenes","ArcGIS;Esri","OGC;NITF","Commercial",
     "Defense;Space;Env","GSA/Direct","Dual-use",
     "https://www.nv5geospatialsoftware.com/Products/ENVI","","","",""),

    ("ERDAS IMAGINE","IMINT","Imagery Exploitation","Hexagon","Commercial","Suite",
     "Remote sensing suite incl. photogrammetry and Spatial Modeler.",
     "Classification;Photogrammetry;Radar","Modeler",
     "IMINT;Mapping","Products;Models",
     "EO/SAR","Orthos;DEM;Indices","APIs","Desktop/Server",
     "Enterprise-grade","Hexagon stack;Esri","OGC;NITF","Commercial",
     "Defense;Mapping","Direct","Dual-use",
     "https://hexagon.com/products/erdas-imagine","","","",""),

    ("ESA SNAP","IMINT/SAR","Processing","ESA","Open Source","Suite",
     "Sentinel Application Platform with EO/SAR toolboxes.",
     "Sentinel-1/2/3;PolSAR;Subsetting","Plugins",
     "EO/SAR processing","Calibration;Products",
     "Sentinel SAFE;GeoTIFF","L2 products","Java API","Desktop",
     "Scene-scale","QGIS;GDAL","OGC","GPL",
     "EO community","", "","","https://step.esa.int/main/download/snap-download/","","",""),

    ("ISCE2","SAR","InSAR/Stack","NASA JPL","Open Source","Toolkit",
     "InSAR processing chain for stripmap/ScanSAR.",
     "Interferograms;Coherence;Stacking","CLI",
     "Deformation mapping","Hazard monitoring",
     "SAR SLCs;Orbits","Interferograms;Velocity","Python","Desktop/Server",
     "Cluster-friendly","GMT;SNAPHU","","Apache-2.0",
     "Academia;Agencies","", "","","https://github.com/isce-framework/isce2","","",""),

    ("GMTSAR","SAR","InSAR","UCSD","Open Source","Toolkit",
     "InSAR processing based on GMT.",
     "Coreg;Interf;Topo removal","CLI",
     "Deformation maps","Hazard monitoring",
     "SAR SLCs","Interferograms","CLI","Desktop/Server",
     "Batch-friendly","GMT;SNAPHU","","GPL",
     "Academia","", "","","https://topex.ucsd.edu/gmtsar/","","",""),

    ("PolSARpro","SAR","Polarimetric SAR","ESA/IETR","Open Source","Toolkit",
     "Polarimetric SAR education and processing.",
     "Decomposition;Filters;Calib","GUI/CLI",
     "Polarimetric analysis","Education;Research",
     "SAR SLCs","Products;Plots","","Desktop",
     "Scene-scale","SNAP;GDAL","","Freeware",
     "Academia","", "","","https://earth.esa.int/eogateway/tools/polsarpro","","",""),

    ("SNAPHU","SAR","Phase Unwrapping","Stanford","Open Source","Tool",
     "Statistical-cost network-flow phase unwrapping.",
     "Unwrapping;Tiling","CLI",
     "InSAR processing","Deformation;DEM",
     "Wrapped phase","Unwrapped phase","","Desktop/Server",
     "Scales by tiling","SNAP;GMTSAR;ISCE2","","Free",
     "Academia","", "","","https://www-quote.cs.stanford.edu/software/","","",""),

    # OSINT / IO / TIP
    ("Maltego","OSINT","Link analysis","Maltego","Commercial","Application",
     "Entity link analysis with transform marketplace.",
     "Transforms;Graph;Import/Export","Hub",
     "Investigations;Due diligence","Attribution;Network maps",
     "Open/Credentialed data","Graphs;Exports","Transform APIs","Desktop/Cloud",
     "Project to enterprise","Vendor & 3rd-party","STIX (via add-ons)","Commercial",
     "LE;Intel;Corporate","G-Cloud/Direct","","https://www.maltego.com/","","",""),

    ("SpiderFoot","OSINT","Automation","SpiderFoot/Intel471","Open Source + SaaS","Application",
     "Automated OSINT scanning with 200+ modules.",
     "Subdomains;Leaks;Whois;Breaches","CLI/Web",
     "Footprinting;Recon","Surface discovery",
     "Open web;APIs","Findings;CSV/JSON","REST;Plugins","Desktop/Cloud",
     "Fast;Parallel","Elasticsearch;SIEM","","GPL/SaaS",
     "Blue teams;Investigators","","","https://www.spiderfoot.net/","","",""),

    ("Hunchly","OSINT","Evidence capture","Hunchly","Commercial","Application",
     "Forensic web capture with hashes and case mgmt.",
     "Auto-capture;Hash;Tagging","Browser ext",
     "Evidence preservation","Case building",
     "Web pages","Signed HTML/PDF","JSON;Exports","Desktop",
     "Local-scale","Case systems","","Commercial",
     "LE;Journalists","Direct","","https://hunch.ly/","","",""),

    ("OpenCTI","CYBINT","Threat intel platform","Filigran","Open Source","Server",
     "Graph-based TIP with connectors and STIX 2.",
     "Entities;Relations;Imports/Exports","Connector SDK",
     "CTI management;Enrichment","Intel fusion",
     "STIX/TAXII;Feeds","STIX;Reports;Indicators","GraphQL;REST","Server",
     "Scales with hardware","MISP;SIEM;SOAR","STIX/TAXII","AGPL",
     "SOCs;CERTs","Support","","https://www.opencti.io/","","",""),

    ("MISP","CYBINT","Intel sharing","MISP Project","Open Source","Server",
     "Indicator sharing platform with taxonomies and galaxies.",
     "Events;Feeds;Sync","APIs",
     "Intel exchange;Automation","IOC mgmt",
     "IOCs;Reports","Feeds;Exports","REST;PyMISP","Server",
     "Federated","OpenCTI;SIEM;SOAR","STIX/TAXII","GPL",
     "CERTs;SOCs","","","https://www.misp-project.org/","","",""),

    ("TheHive","CYBINT","IR case mgmt","StrangeBee","Open Core","Server",
     "Incident response case management tied to Cortex automations.",
     "Cases;Tasks;TTPs","Cortex analyzers",
     "SOC/CSIRT cases","IR workflows",
     "Alerts;Observables","Reports;Artifacts","REST","Server",
     "Team-scale","MISP;SIEM;Slack","","Elastic License/OSS",
     "SOCs;CSIRTs","","","https://strangebee.com/thehive/","","",""),

    ("Shodan","OSINT","Device search","Shodan","Commercial","SaaS",
     "Search engine for internet-connected devices.",
     "Banners;Filters;Exposures","API",
     "Asset discovery;Exposure mgmt","Recon;Risk",
     "Banners;Ports","Results;Exports","REST","Cloud",
     "Web-scale","SIEM;TIP","","Commercial",
     "Blue teams;Researchers","Direct","","https://www.shodan.io/","","",""),

    ("Censys","OSINT","Device/cert search","Censys","Commercial","SaaS",
     "Internet scan data for hosts, certs, and exposures.",
     "Search;Queries;Mappings","API",
     "Attack surface;Research","Exposure tracking",
     "Scan data;Certs","Results;Exports","REST","Cloud",
     "Web-scale","SIEM;TIP","","Commercial",
     "Enterprises;Researchers","Direct","","https://censys.com/","","",""),

    ("SecurityTrails","OSINT","DNS/Exposure","SecurityTrails","Commercial","SaaS",
     "Historical DNS, WHOIS, and asset data.",
     "Historical DNS;WHOIS;Subs","API",
     "Attribution;Inventory","Mappings;Exports",
     "DNS;WHOIS","Results;CSV/JSON","REST","Cloud",
     "Large-scale","SIEM;TIP","","Commercial",
     "Enterprises;Investigators","Direct","","https://securitytrails.com/","","",""),

    ("Microsoft Defender EASM (RiskIQ)","OSINT","EASM","Microsoft","Commercial","SaaS",
     "External attack surface management via RiskIQ tech.",
     "Discovery;Attribution;Exposure","API",
     "Asset inventory;Risk","Exposure remediation",
     "Passive DNS;Web;Certs","Assets;Findings","REST","Cloud",
     "Web-scale","MDE;Sentinel","","Commercial",
     "Enterprises","Azure Marketplace","","https://learn.microsoft.com/azure/defender-easm/","","",""),

    ("IntelligenceX","OSINT","Search","IntelligenceX","Commercial","SaaS",
     "Search across web, darknet, leaks, and documents.",
     "Leaks;Darknet;Documents","API",
     "Due diligence;Investigations","Attribution",
     "Web;Darknet;Leaks","Results;Exports","REST","Cloud",
     "Large-scale","Analyst tools","","Commercial",
     "LE;Investigators","Direct","","https://intelx.io/","","",""),

    ("intelgraph (repo)","OSINT","Graph/Intel tooling","Brian C. Long","Open Source","Repository",
     "User-supplied repo for intelligence graphing/analysis (extend as needed).",
     "Graph pipeline;Data modeling (extensible)","",
     "Integrate into your OSINT stack","Investigation graphing",
     "CSV/JSON","Graphs/Exports","","Local/Cloud",
     "Project-scale","Maltego/OpenCTI (custom)","","MIT/OSS",
     "Practitioners","", "","https://github.com/BrianCLong/intelgraph","","",""),

    # CYBINT / SIEM / DFIR / EDR
    ("Splunk Enterprise Security","CYBINT","SIEM","Splunk","Commercial","Server",
     "SIEM analytics on Splunk platform with detections and UEBA.",
     "Notables;Risk-based alerting;ML","Search/Apps",
     "SOC detection;Compliance","IR;Dashboards",
     "Logs;NetFlow;EDR","Notables;Incidents","REST;SDK","Server/Cloud",
     "Cluster scale","EDR;SOAR","","Commercial",
     "Enterprises;Gov","GSA/Direct","","https://www.splunk.com/en_us/software/enterprise-security.html","","",""),

    ("IBM QRadar","CYBINT","SIEM","IBM","Commercial","Server",
     "SIEM with correlation rules, flows, and app ecosystem.",
     "Offenses;Rules;Apps","App framework",
     "SOC detection;Compliance","IR;Dashboards",
     "Logs;Flows","Offenses;Reports","REST","Server/Cloud",
     "Enterprise scale","EDR;SOAR","","Commercial",
     "Public sector;FSI","GSA/SEWP","","https://www.ibm.com/products/qradar-siem","","",""),

    ("Elastic Security","CYBINT","SIEM/EDR","Elastic","Commercial + OSS","Server",
     "SIEM+EDR detections on Elastic Stack.",
     "Detections;Cases;Timeline","Beats/Agents",
     "SOC detection;Threat hunting","IR;Analytics",
     "Logs;EDR;Net","Detections;Cases","REST","Server/Cloud",
     "Cluster scale","Beats;MISP;OpenCTI","","Elastic License/OSS",
     "Enterprises","Marketplace","","https://www.elastic.co/security/","","",""),

    ("Google Chronicle Security Operations","CYBINT","SIEM/UEBA/SOAR","Google","Commercial","Cloud",
     "Chronicle SIEM + SOAR with intel/rules.",
     "UDM;SOAR;D&R","APIs",
     "SOC analytics;IR","Threat hunting",
     "Logs;EDR;Net","UDM events;Incidents","REST","Cloud",
     "Web-scale","Mandiant;VirusTotal","","Commercial",
     "Enterprises","Google Cloud","","https://cloud.google.com/security-operations","","",""),

    ("Microsoft Sentinel","CYBINT","SIEM/SOAR","Microsoft","Commercial","Cloud",
     "Cloud-native SIEM/SOAR on Azure.",
     "Analytics;SOAR;UEBA","KQL/Workbooks",
     "SOC detection;Compliance","IR;Dashboards",
     "Logs;EDR;Net","Incidents;Hunts","REST","Cloud",
     "Azure-scale","MDE;Defender XDR","","Commercial",
     "Enterprises;Gov","Azure Marketplace","","https://azure.microsoft.com/products/sentinel/","","",""),

    ("Zeek","CYBINT","NSM","Zeek Project","Open Source","Server",
     "Network security monitoring and behavioral scripting.",
     "Protocol analyzers;Scripts;Logs","Cluster",
     "Threat hunting;Detection","Forensics;Pivot",
     "PCAP;Live capture","Rich logs","Zeek scripts","Server",
     "Cluster-scale","Elastic;SIEM","","BSD",
     "SOCs;Academia","","","https://zeek.org/","","",""),

    ("Suricata","CYBINT","IDS/IPS/NSM","OISF","Open Source","Server",
     "IDS/IPS/NSM engine with high-speed EVE JSON.",
     "Signatures;TLS;HTTP/DNS;Files","CUDA/DPU opt",
     "Detection;NSM","SOC ops",
     "PCAP;Live","Alerts;Files;Flows","REST;EVE JSON","Server",
     "10–100 Gbps w/ tuning","SIEM;SOAR","","GPLv2",
     "SOCs","","","https://suricata.io/","","",""),

    ("Wireshark","CYBINT","Protocol analysis","Wireshark Foundation","Open Source","Desktop",
     "Packet analyzer with 2,000+ dissectors.",
     "Filters;Coloring;VoIP;Keys","Extcap",
     "IR;Troubleshooting","Training;Forensics",
     "PCAP;Live","Decoded frames","Lua","Desktop",
     "Local","pcap tools","","GPL",
     "All IT/Sec","","","https://www.wireshark.org/","","",""),

    ("Velociraptor","CYBINT","Endpoint DFIR","Open Source","Open Source","Server/Agent",
     "Endpoint visibility and live response at scale.",
     "VQL hunts;Artifacts;Triage","GUI/CLI",
     "IR;Threat hunting","Forensics",
     "Disk;Mem;Registry","Artifacts;Exports","REST","Server/Agents",
     "Large fleets","SIEM;S3","","Apache-2.0",
     "SOCs;Consultancies","","","https://www.velocidex.com/","","",""),

    ("Volatility","CYBINT","Memory forensics","Volatility Foundation","Open Source","Desktop",
     "Memory forensics framework for Windows/Linux/macOS.",
     "Plugins;Timelines;Malware","Profiles",
     "Malware triage;IR","Attribution;Hunting",
     "Memory images","Findings","Python","Desktop",
     "Local","DFIR tools","","GPLv2",
     "Forensics labs","","","https://volatilityfoundation.org/","","",""),

    ("CrowdStrike Falcon","CYBINT","EDR/XDR","CrowdStrike","Commercial","Cloud/Agent",
     "Endpoint detection and response with intel enrichment.",
     "Sensor;Detections;Intel","API",
     "Threat detection;IR","Hunting;Response",
     "Endpoint telemetry","Detections;Cases","REST","Cloud/Agents",
     "Internet-scale","SIEM;SOAR","","Commercial",
     "Enterprises;Gov","GSA/Direct","","https://www.crowdstrike.com/products/endpoint-security/falcon-insight-edr/","","",""),

    ("SentinelOne Singularity","CYBINT","EDR/XDR","SentinelOne","Commercial","Cloud/Agent",
     "Autonomous EDR/XDR with storyline telemetry.",
     "Detections;Rollback;Storyline","API",
     "Threat detection;Response","IR;Containment",
     "Endpoint telemetry","Detections;Cases","REST","Cloud/Agents",
     "Large fleets","SIEM;SOAR","","Commercial",
     "Enterprises","Direct","","https://www.sentinelone.com/platform/singularity-xdr/","","",""),

    ("Microsoft Defender for Endpoint","CYBINT","EDR/XDR","Microsoft","Commercial","Cloud/Agent",
     "EDR/XDR integrated with Microsoft security stack.",
     "Sensor;Hunting;Timeline","API",
     "Threat detection;Response","IR;Containment",
     "Endpoint telemetry","Detections;Cases","REST","Cloud/Agents",
     "Enterprise-scale","Sentinel;Defender XDR","","Commercial",
     "Enterprises;Gov","Direct","","https://www.microsoft.com/security/business/endpoint-security/microsoft-defender-endpoint","","",""),

    ("VMware Carbon Black","CYBINT","EDR","Broadcom/VMware","Commercial","Cloud/Agent",
     "EDR with prevention and telemetry search.",
     "Detections;Triage;Live response","API",
     "Threat detection;IR","Hunting;Forensics",
     "Endpoint telemetry","Detections;Cases","REST","Cloud/Agents",
     "Enterprise-scale","SIEM;SOAR","","Commercial",
     "Enterprises","Direct","","https://www.carbonblack.com/","","",""),

    # FININT / AML / KYC
    ("Chainalysis Reactor","FININT","Blockchain analytics","Chainalysis","Commercial","SaaS",
     "Investigative tracing of cryptocurrency flows and entities.",
     "Attribution;Tracing;Graph","APIs",
     "Crypto crime;Sanctions evasion","Case support",
     "On-chain data","Graphs;Reports","REST","Cloud",
     "Global coverage","Case mgmt tools","","Commercial",
     "LE;Regulators;Banks","Direct;GSA","","https://www.chainalysis.com/product/reactor/","","",""),

    ("TRM Labs Forensics","FININT","Blockchain analytics","TRM Labs","Commercial","SaaS",
     "Crypto forensics and transaction monitoring.",
     "Attribution;Screening;Risk","APIs",
     "Investigations;Compliance","Alerts;Reports",
     "On-chain;KYC","Graphs;Alerts","REST","Cloud",
     "Global coverage","Case mgmt","","Commercial",
     "LE;FSI","Direct","","https://www.trmlabs.com/","","",""),

    ("Elliptic Navigator","FININT","Blockchain analytics","Elliptic","Commercial","SaaS",
     "Blockchain analytics with wallet/entity clustering.",
     "Risk scores;Graph;Attribution","APIs",
     "Investigations;Compliance","Risk scoring",
     "On-chain","Graphs;Scores","REST","Cloud",
     "Enterprise-scale","Case tools","","Commercial",
     "Banks;Exchanges","Direct","","https://www.elliptic.co/products/elliptic-navigator","","",""),

    ("ComplyAdvantage","FININT","KYC/AML","ComplyAdvantage","Commercial","SaaS",
     "Screening for sanctions, PEP, adverse media.",
     "PEP;Sanctions;Adverse media","APIs",
     "KYC/KYB screening","Risk mgmt",
     "Customer data;Media","Alerts;Cases","REST","Cloud",
     "Web-scale","Case mgmt","","Commercial",
     "Banks;Fintech","Direct","","https://complyadvantage.com/","","",""),

    ("LSEG World-Check","FININT","KYC data","LSEG (Refinitiv)","Commercial","Data/SaaS",
     "Global PEP/sanctions/adverse media datasets.",
     "Watchlists;Adverse;IDV","APIs",
     "KYC/KYB;Screening","Risk mgmt",
     "Customer data","Hits;Scores","REST","Cloud",
     "Global coverage","AML suites","","Commercial",
     "Banks;Gov","Direct","","https://www.lseg.com/en/risk-intelligence/screening-solutions/world-check-kyc-screening","","",""),

    ("Quantexa","FININT","Entity resolution","Quantexa","Commercial","Platform",
     "Entity resolution and network analytics for AML/Fraud.",
     "Graph;Contextual AI;ER","APIs",
     "AML;Fraud;KYC","Risk detection",
     "KYC;Transactions","Graphs;Alerts","REST","Cloud/On-prem",
     "Enterprise-scale","AML suites","","Commercial",
     "Banks;Gov","Direct","","https://www.quantexa.com/","","",""),

    # HUMINT / CRIMINT
    ("Palantir Gotham","HUMINT","Data fusion/Investigations","Palantir","Commercial","Platform",
     "Ops intelligence and investigations platform.",
     "Entity graph;Cases;Workflows","APIs",
     "All-source analysis;Ops planning","Investigations",
     "Multi-source","Objects;Reports","REST;SDK","Cloud/On-prem",
     "Enterprise-scale","Esri;i2;EDR;SIEM","","Commercial",
     "Defense;LE","Multiple","","https://www.palantir.com/platforms/gotham/","","",""),

    ("i2 Analyst's Notebook","CRIMINT","Link/Temporal analysis","i2 Group","Commercial","Desktop/SaaS",
     "Link and temporal analysis with import/export.",
     "Charts;Timelines;Imports","SDK",
     "Investigations;Network mapping","Case support",
     "CSV;DB;APIs","Charts;Exports","SDK","Desktop/Cloud",
     "Analyst-scale","Gotham;Siren","","Commercial",
     "LE;Defense","Direct","","https://i2group.com/solutions/i2-analysts-notebook","","",""),

    ("Cellebrite UFED","CRIMINT","Mobile forensics","Cellebrite","Commercial","Appliance/Software",
     "Device and cloud data extraction for DFIR.",
     "Extraction;Decoding;Cloud","Case mgmt",
     "Digital evidence collection","Investigations",
     "Device;Cloud;Backups","Reports;Images","APIs","Appliance/Desktop",
     "Lab/field kits","Case systems","","Commercial",
     "LE","LE contracts","Potential export","https://cellebrite.com/en/ufed/","","",""),

    ("Magnet AXIOM","CRIMINT","Digital forensics","Magnet Forensics","Commercial","Desktop/Server",
     "Evidence analysis across computer/mobile/cloud.",
     "Timeline;Artifacts;Analytics","APIs",
     "DFIR investigations","Reporting;Correlation",
     "Images;Backups;Cloud","Evidence;Reports","REST","Desktop/Server",
     "Lab-scale","Case systems","","Commercial",
     "LE;Corp DFIR","Direct","","https://www.magnetforensics.com/products/magnet-axiom/","","",""),

    # CI / Secure Comms
    ("Signal","CI","Secure messaging","Signal Foundation","Open Source","App/Protocol",
     "E2EE messaging protocol and apps.","Sealed sender;Safety numbers","Signal protocol",
     "Sensitive comms","NGO;LE-approved uses vary",
     "Messages;Media","E2EE payloads","Signal protocol","Mobile/Desktop",
     "Global scale","","","GPL/Server;OSS",
     "NGO;At-risk users","","","https://signal.org/","","",""),

    ("Tor Browser/Network","CI","Anonymity","Tor Project","Open Source","Network/Apps",
     "Onion routing + Tor Browser.","Pluggable transports;Onion svcs","SOCKS",
     "Research;At-risk comms","Privacy",
     "TCP;HTTP(S)","Circuits","SOCKS;Control port","Desktop/Mobile",
     "Global network","Tails;Whonix","","BSD-like",
     "Researchers;NGO","","","https://www.torproject.org/","","",""),

    ("Tails","CI","Amnesic OS","Tails Project","Open Source","OS",
     "Live amnesic OS (Tor-by-default).","Persistence (optional);MAC spoof","",
     "Field ops hygiene","Privacy;Safety",
     "User IO","Ephemeral state","","Live USB",
     "Local","Tor;KeePassXC;GnuPG","","GPL",
     "Journalists;Activists","","","https://tails.boum.org/","","",""),

    ("Wickr (AWS)","CI","Secure collaboration","Amazon","Commercial","SaaS",
     "E2EE messaging/calls/files with compliance controls.",
     "E2EE;Retention rules;SSO","APIs",
     "Secure team comms","Gov/Enterprise",
     "Messages;Media","E2EE payloads","REST","Cloud",
     "Enterprise-scale","AWS GovCloud","","Commercial",
     "Enterprises;USG","AWS Marketplace","","https://aws.amazon.com/wickr/","","",""),

    # PSYOPS / IO (defensive analytics)
    ("Graphika Platform","PSYOPS/IO","Narrative/network analytics","Graphika","Commercial","SaaS",
     "Network mapping & narrative intelligence on social ecosystems.",
     "Community detection;Narratives;Alerts","APIs",
     "IO detection;Research","Counter-messaging support",
     "Social/web data","Communities;Reports","REST","Cloud",
     "Web-scale","","","Commercial",
     "Gov;Brands;NGO","Direct","","https://graphika.com/","","",""),

    ("Logically Intelligence","PSYOPS/IO","Misinformation risk","Logically","Commercial","SaaS",
     "Misinformation detection & narrative monitoring.",
     "Multilingual;Risk scoring;Dashboards","APIs",
     "Elections;Crisis;Brand risk","Counter-messaging support",
     "Social/web data","Alerts;Reports","REST","Cloud",
     "Web-scale","","","Commercial",
     "Gov;Platforms","G-Cloud (UK)","","https://www.logically.ai/logically-intelligence","","",""),

    ("Botometer X","PSYOPS/IO","Bot detection","Indiana Univ. OSoMe","Academic/Open","API/App",
     "Scores likelihood of social accounts being bots.","Network features;ML","API",
     "Campaign triage;Research","IO support",
     "Platform metadata","Scores;Timeseries","REST","Cloud",
     "Scales via API","","","Apache-2.0",
     "Academia;Platforms","","","https://botometer.osome.iu.edu/","","",""),

    ("Hoaxy","PSYOPS/IO","Claim diffusion viz","Indiana Univ. OSoMe","Academic/Open","Web",
     "Visualizes spread of claims and fact-checks.","Diffusion graphs;Timeline","",
     "Narrative tracking;Research","IO support",
     "Social shares;Claims","Graphs","","Web",
     "Platform-scale","","","Apache-2.0",
     "Academia;Journalists","","","https://hoaxy.osome.iu.edu/","","",""),
]

# Write matrix CSV + JSON
matrix_csv = os.path.join(DATA, "intel_tools_matrix.csv")
write_csv(matrix_csv, matrix_header, tools)
with open(os.path.join(DATA, "intel_tools_matrix.json"), "w", encoding="utf-8") as f:
    json.dump([dict(zip(matrix_header, row)) for row in tools], f, indent=2)

# ---------- VERTICALS (Home/Finance/Travel/Shopping/Academic/Sports/Library) ----------
vertical_header = ["Domain","Category","Software","Vendor","Type","Description","Sources_Official"]
vertical_rows = [
    ("Finance","AML/KYC","LSEG World-Check","LSEG (Refinitiv)","Data/SaaS","Global PEP/sanctions/adverse media datasets.","https://www.lseg.com/en/risk-intelligence/screening-solutions/world-check-kyc-screening"),
    ("Finance","AML/KYC","ComplyAdvantage","ComplyAdvantage","SaaS","KYC/KYB screening with sanctions and adverse media.","https://complyadvantage.com/"),
    ("Finance","Blockchain Analytics","Chainalysis Reactor","Chainalysis","SaaS","Crypto tracing and investigations.","https://www.chainalysis.com/product/reactor/"),
    ("Finance","Blockchain Analytics","TRM Labs Forensics","TRM Labs","SaaS","Crypto forensics and transaction monitoring.","https://www.trmlabs.com/"),
    ("Travel","Aviation Tracking","dump1090","Community","Open Source","ADS-B/Mode S decoder for aircraft tracking.","https://github.com/antirez/dump1090"),
    ("Travel","Aviation Data","FlightAware Firehose","FlightAware","SaaS","Aviation data feed and analytics.","https://flightaware.com/commercial/firehose/"),
    ("Travel","Mapping","ArcGIS Online","Esri","SaaS","Cloud GIS for maps and dashboards.","https://www.esri.com/en-us/arcgis/products/arcgis-online/overview"),
    ("Shopping","Brand/Digital Risk","ZeroFox","ZeroFox","SaaS","Digital risk protection and brand monitoring.","https://www.zerofox.com/"),
    ("Shopping","E-commerce Fraud","Sift","Sift","SaaS","E-commerce fraud detection and abuse prevention.","https://sift.com/"),
    ("Academic","Research Capture","Hunchly","Hunchly","Commercial","Forensic web capture for research and investigations.","https://hunch.ly/"),
    ("Academic","Scholarly Index","OpenAlex","OurResearch","Open Data","Scholarly metadata graph/API.","https://openalex.org/"),
    ("Sports","Pro Analytics","Second Spectrum","Second Spectrum","SaaS","Sports analytics and tracking.","https://www.secondspectrum.com/"),
    ("Sports","Data Feeds","Stats Perform","Stats Perform","SaaS","Sports data feeds and analytics.","https://www.statsperform.com/"),
    ("Library","ILS","Koha","Koha Community","Open Source","Integrated library system.","https://koha-community.org/"),
    ("Library","Repository","DSpace","Lyrasis/DSpace","Open Source","Institutional repository platform.","https://dspace.lyrasis.org/"),
    ("Home","Privacy","Signal","Signal Foundation","Open Source","E2EE messaging for personal comms.","https://signal.org/"),
    ("Home","Backup/Encrypt","VeraCrypt","IDRIX","Open Source","Disk encryption for backups.","https://veracrypt.fr/"),
]
write_csv(os.path.join(DATA, "vertical_software.csv"), vertical_header, vertical_rows)

# ---------- ENTITIES (Name | When | Allegiance | Agency/Org/Service) ----------
entities_header = ["Name","When","Allegiance","Agency_Organization_Service","Role_or_Function","Sources_Official","Sources_RFP_RFI","Sources_Academic","Sources_Patents","Notes"]
entities_rows = [
    ("National Security Agency","1952–present","USA","NSA/CSS","Signals Intelligence & Cybersecurity","https://www.nsa.gov","","","", ""),
    ("Government Communications Headquarters","1919–present","UK","GCHQ","Signals Intelligence & Cybersecurity","https://www.gchq.gov.uk","","","", ""),
    ("Defense Intelligence Agency","1961–present","USA","DIA","Defense intelligence","https://www.dia.mil","","","", ""),
    ("National Geospatial-Intelligence Agency","1996–present","USA","NGA","GEOINT/IMINT","https://www.nga.mil","","","", ""),
    ("Federal Bureau of Investigation","1908–present","USA","FBI","Law enforcement & counterintelligence","https://www.fbi.gov","","","", ""),
    ("Central Intelligence Agency","1947–present","USA","CIA","All-source intelligence","https://www.cia.gov","","","", ""),
]
write_csv(os.path.join(DATA, "entities_master.csv"), entities_header, entities_rows)

# ---------- README ----------
readme = f"""# Intelligence & Vertical Software Bundle — Start-Over Edition
Generated: {TS}

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

"""
with open(os.path.join(BASE, "README.md"), "w", encoding="utf-8") as f:
    f.write(readme)

# ---------- Simple UI ----------
index_html = """<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Intelligence Catalog</title><link rel="stylesheet" href="styles.css">
</head><body>
<header>
  <nav class="nav">
    <a href="#home">Home</a>
    <a href="#finance">Finance</a>
    <a href="#travel">Travel</a>
    <a href="#shopping">Shopping</a>
    <a href="#academic">Academic</a>
    <a href="#sports">Sports</a>
    <a href="#library">Library</a>
  </nav>
  <nav class="nav secondary">
    <a href="#discover">Discover</a>
    <a href="#spaces">Spaces</a>
    <a href="#account">Account</a>
  </nav>
</header>
<main>
  <section id="home"><h1>Home</h1><p>Privacy, secure comms, and general tools.</p></section>
  <section id="finance"><h1>Finance</h1><p>AML/KYC & blockchain analytics platforms.</p></section>
  <section id="travel"><h1>Travel</h1><p>Aviation tracking and mapping stacks.</p></section>
  <section id="shopping"><h1>Shopping</h1><p>Digital risk, fraud prevention, brand protection.</p></section>
  <section id="academic"><h1>Academic</h1><p>Research tools, data repositories, and capture.</p></section>
  <section id="sports"><h1>Sports</h1><p>Sports data providers and analytics.</p></section>
  <section id="library"><h1>Library</h1><p>ILS and repository software.</p></section>
  <section id="discover"><h1>Discover</h1><p>Extend with dashboards and BI of your choice.</p></section>
  <section id="spaces"><h1>Spaces</h1><p>Team spaces, playbooks, and workflow notes.</p></section>
  <section id="account"><h1>Account</h1><p>Profile and access controls (stub).</p></section>
</main>
<footer><small>Generated bundle — Start-Over Edition</small></footer>
</body></html>
"""
styles_css = """body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0}
.nav{display:flex;gap:1rem;padding:0.8rem 1rem;background:#111;flex-wrap:wrap}
.nav.secondary{background:#222}
.nav a{color:#fff;text-decoration:none;font-weight:600}
main{padding:1rem 1.25rem}
section{padding:0.5rem 0 1.25rem;border-bottom:1px solid #eee}
h1{margin:0.25rem 0 0.25rem}
footer{padding:1rem;color:#666}
"""
with open(os.path.join(UI, "index.html"), "w", encoding="utf-8") as f:
    f.write(index_html)
with open(os.path.join(UI, "styles.css"), "w", encoding="utf-8") as f:
    f.write(styles_css)

# ---------- ZIP IT ----------
zip_name = "intel-startover-bundle.zip"
with zipfile.ZipFile(zip_name, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(BASE):
        for file in files:
            p = os.path.join(root, file)
            z.write(p, arcname=os.path.relpath(p, BASE))

print(f"Created {zip_name}")

