# OSINT Source Inventory

Curated open-source intelligence feeds prioritized for IntelGraph ingestion.

## High-Value Sources

1. **CISA Known Exploited Vulnerabilities** – catalog of actively exploited CVEs.
2. **National Vulnerability Database (NVD) API** – comprehensive vulnerability metadata.
3. **MITRE ATT&CK** – tactics, techniques, and procedures knowledge base.
4. **Shodan API** – internet-exposed device and service scanning.
5. **VirusTotal API** – file, URL, and domain malware intelligence.
6. **WHOIS/RDAP** – domain ownership and registration data.
7. **OpenCorporates API** – global corporate registry information.
8. **AlienVault OTX** – community threat intelligence pulses.
9. **Have I Been Pwned API** – breached credential and account exposure.
10. **GDELT Project** – global news event monitoring.
11. **US Treasury OFAC SDN List** – sanctions against individuals and entities.
12. **OpenSanctions** – consolidated sanctions and politically exposed person data.
13. **UN Comtrade** – international trade statistics.
14. **IMF Data API** – macroeconomic indicators.
15. **World Bank Open Data** – global development metrics.
16. **CrowdStrike Falcon Intel API** – adversary and threat actor profiles.
17. **AbuseIPDB** – malicious IP reputation reports.
18. **GreyNoise API** – internet background noise and benign scanner context.
19. **Recorded Future API** – threat intelligence and risk scores.
20. **FBI IC3 Reports** – cybercrime complaints and trends.
21. **Eurostat** – European economic and demographic statistics.
22. **Common Crawl** – web-scale content snapshots for NLP analysis.
23. **GitHub Security Advisories** – vulnerability advisories for open-source projects.
24. **CVE Program JSON Feeds** – authoritative CVE data from MITRE.
25. **PeeringDB API** – internet infrastructure ownership and interconnection data.

## Additional Sources

1. Alexa Top Sites
2. AP News API
3. Archive.org
4. Bitcoin Abuse Database
5. Blockchain.com API
6. BleepingComputer RSS
7. BuiltWith API
8. CIRCL CVE Search
9. Crt.sh certificate transparency
10. CryptoScamDB
11. CyberCrime Tracker
12. DarkReading RSS
13. DeepDotWeb Archives
14. DNSDB API
15. Emerging Threats rulesets
16. Europol Newsroom
17. GitLab Advisory Database
18. Google Transparency Report
19. HackerNews (YCombinator)
20. Internet Archive Malware Museum
21. IPinfo API
22. Kaggle public datasets
23. MISP Galaxy/Taxonomy feeds
24. Netcraft phishing feeds
25. NIST Cybersecurity Framework resources
26. OpenPhish
27. Pastebin scraping
28. PhishTank
29. Reddit r/netsec
30. RiskIQ PassiveTotal
31. SANS ISC Storm Center
32. SecurityTrails API
33. Spamhaus DROP lists
34. Team Cymru IP/ASN data
35. ThreatFox
36. Tor Project exit node list
37. Twitter/X trending topics
38. URLHaus
39. US CERT advisories
40. Wikidata
41. SMIC Micro-Expression Dataset
42. CASME II Facial Micro-Expression Dataset

## Comprehensive Source Catalog

### Core Cybersecurity & Threat Intel

#### Vulnerabilities

- CISA Known Exploited Vulnerabilities (KEV) – Catalog of actively exploited CVEs maintained by CISA (Feed).
- National Vulnerability Database (NVD) API – Comprehensive vulnerability metadata from NIST (API).
- CVE Program JSON Feeds – Authoritative CVE data feeds from MITRE (API).
- GitHub Security Advisories (GHSA) – Advisories for open-source software vulnerabilities (API).
- GitLab Advisory Database – GitLab-hosted advisories for projects and dependencies (Feed).
- OWASP Dependency-Check Data – Data used in dependency-check vulnerability scanning (Feed).

#### Threat Intelligence Feeds

- MITRE ATT&CK (STIX/TAXII) – Tactics, techniques, and procedures knowledge base (Framework).
- MITRE CAPEC – Catalog of attack patterns (Framework).
- MITRE D3FEND – Countermeasure knowledge base mapped to ATT&CK (Framework).
- AlienVault OTX – Community threat intelligence pulses & API (API).
- Anomali ThreatStream (Open Source Feeds) – Open-source threat intelligence feeds from Anomali (Feed).
- Abuse.ch ThreatFox – IOC sharing platform (API).
- Abuse.ch MalwareBazaar – Malware samples and hash sharing (API).
- Abuse.ch URLHaus – Malware distribution URL database (API).
- PhishTank – Crowdsourced phishing URL reports (API).
- OpenPhish – Phishing intelligence feeds (API).
- Cisco Talos Intelligence Blog – Threat research from Cisco Talos (RSS).
- SANS ISC Storm Center – Daily threat monitoring and intelligence feed (Feed).
- Emerging Threats (Proofpoint) Rulesets – IDS/IPS signatures and rules (Feed).
- Spamhaus DROP/EDROP Lists – Malicious and spam-related IP blocklists (Feed).

#### Malware Analysis

- VirusTotal API v3 – File, URL, and domain malware intelligence (API).
- Hybrid Analysis API – File behavior analysis reports (API).
- ANY.RUN Public Submissions – Interactive malware sandbox (Tool).
- PolySwarm Threat Feeds – Crowdsourced malware scanning intelligence (API).

### Infrastructure & Network Intelligence

#### IP/ASN & Routing

- WHOIS / RDAP (RIR APIs: ARIN, RIPE, APNIC, LACNIC, AFRINIC) – Domain and IP ownership and registration data (API).
- PeeringDB API – Interconnection data for networks and IXPs (API).
- RIPE NCC Atlas Measurements – Global active measurement network data (Feed).
- BGP.Tools API – BGP routing and ASN data (API).
- Team Cymru IP/ASN Mapping – Whois.cymru.com service for IP-ASN lookups (API).
- RADb (Routing Assets Database) – Internet routing registry database (Feed).
- Hurricane Electric BGP Toolkit – AS-level routing and prefix data (Tool).
- CAIDA Ark Datasets – Topology and routing measurement datasets (Dataset).
- RPKI Validator Feeds – Route Origin Validation datasets (Feed).

#### DNS & Certificates

- DNSDB API (Farsight) – Passive DNS database API (API).
- Censys API – Internet-wide scanning and certificates data (API).
- ShadowServer ASN/Network Reports – Daily reports on botnets, malware, and misconfigurations (Feed).
- crt.sh Certificate Transparency Logs – CT log search and monitoring (API).
- Google Certificate Transparency Logs – Public Google CT logs (Feed).
- LetsEncrypt CT Logs – Let’s Encrypt transparency logs (Feed).
- CertStream – Real-time certificate transparency feed (Feed).
- DNSLytics API – Domain and DNS analytics data (API).
- DomainTools API – Domain WHOIS and passive DNS (API).
- Robtex API – Domain and IP relationships (API).
- BuiltWith API – Website technology stack profiler (API).

#### Hosting & Cloud

- Tor Project Exit Node List – List of current Tor exit nodes (Feed).
- VPN & Proxy Blocklists (e.g., IP2Proxy) – IP ranges of known VPN and proxy providers (Feed).
- AWS IP Ranges – Official published Amazon cloud IPs (Feed).
- Azure IP Ranges – Microsoft Azure cloud IPs (Feed).
- Google Cloud IP Ranges – Google Cloud published IP ranges (Feed).
- Oracle Cloud IP Ranges – Oracle Cloud published IP ranges (Feed).
- Cloudflare IP Ranges – Cloudflare published IP ranges (Feed).
- Fastly IP Ranges – Fastly published IP ranges (Feed).

### Digital Identity & Attribution

#### Breach Monitoring

- Have I Been Pwned API – Database of breached credentials and accounts (API).
- DeHashed API – Aggregated breach and credential lookup service (API).
- Snusbase API – Breached data search and lookup (API).
- IntelligenceX API – Search engine for leaked data and archives (API).
- Leak-Lookup API – Database of leaked credentials (API).
- WeLeakInfo API (via partners) – Leaked credentials database service (API).
- BreachDirectory API – Breach data and password database (API).

#### Email Intelligence

- Hunter.io API – Email discovery and verification (API).
- MailboxValidator API – Email validation and reputation checks (API).

#### Enrichment

- Clearbit API – Email, domain, and person enrichment (API).
- FullContact API – Identity resolution and contact enrichment (API).
- ZoomInfo Enrich (Limited) – Professional and company enrichment data (API).

#### Social Media & Community

- LinkedIn Public Data (via ProxyCrawl) – Public LinkedIn profiles and company data (Scraper).
- Facebook Public Pages – OSINT scraping of public Facebook content (Scraper).
- Twitter API (Academic Track) – Historical and large-scale Twitter/X access (API).
- Instagram Public Scraping – Scraping public Instagram data for OSINT (Scraper).
- Telegram Channel Monitoring – Monitoring public Telegram groups and channels (Tool).
- Keybase.io API – Public cryptographic identities and profiles (API).
- PGP Key Servers (SKS Pool) – PGP/GPG public key lookup (API).

#### Username Search

- Namechk – Cross-platform username availability and OSINT tool (Tool).

### Financial & Regulatory Risk

#### Sanctions & Watchlists

- US Treasury OFAC SDN List – Official US list of sanctioned individuals and entities (Feed).
- OpenSanctions API – Aggregated sanctions and politically exposed persons database (API).
- UN Security Council Sanctions Lists – UN-mandated sanctions entities and individuals (Feed).
- EU Financial Sanctions List – European Union consolidated financial sanctions list (Feed).
- UK OFSI Sanctions List – UK Office of Financial Sanctions Implementation consolidated list (Feed).
- AUSTRAC Regulatory Data – Australian Transaction Reports and Analysis Centre compliance datasets (Feed).
- FATF High-Risk Jurisdictions – Financial Action Task Force lists of high-risk jurisdictions (Feed).
- FinCEN Advisories & Lists – Financial Crimes Enforcement Network advisories (Feed).
- World-Check Screening Data (Refinitiv) – Paid database for sanctions and PEP screening (Commercial).
- Dow Jones Risk & Compliance – Commercial risk and compliance database (Commercial).

#### Corporate Registries

- OpenCorporates API – Global open corporate registry data (API).
- Companies House UK API – UK company registration filings (API).
- LEI Search (GLEIF API) – Legal Entity Identifier lookups (API).
- Bureau van Dijk (BvD) Open Data – Corporate ownership and compliance data (Commercial).
- Bloomberg Entity Exchange – Entity compliance data platform (limited free access) (Commercial).
- Reuters World-Check One – Compliance risk database (limited/free tier available) (Commercial).
- Dow Jones Factiva – News-based entity due diligence database (Commercial).
- S&P Global Market Intelligence – Financial and compliance intelligence (Commercial).

#### Regulatory Filings

- EDGAR SEC Filings – Public company filings with the US Securities and Exchange Commission (API).
- SWIFT Refinitiv KYC Registry – Know Your Customer (KYC) registry for financial institutions (Commercial).

### Geopolitical & Economic Intelligence

#### News & Events

- GDELT Project API & GKG – Global news event monitoring and Global Knowledge Graph (API).

#### Trade & Economics

- UN Comtrade API – International trade statistics database (API).
- IMF Data API – International Monetary Fund macroeconomic data (API).
- World Bank Open Data API – Global development and economic indicators (API).
- Eurostat API – European Union economic and demographic statistics (API).
- OECD Data API – OECD datasets on economics and social development (API).
- UNCTADstat – United Nations trade and development statistics (Dataset).
- FAO Statistical Database – Food and agriculture datasets from the UN FAO (Dataset).
- WTO Stats Portal – World Trade Organization statistical data (Portal).
- BIS Statistics API – Bank for International Settlements statistics (API).

#### Monetary & Demographics

- ECB Statistical Data Warehouse – European Central Bank economic and monetary datasets (API).
- US BEA Data API – US Bureau of Economic Analysis national statistics (API).
- US Census Bureau API – Demographic and economic census data (API).

#### Reference

- CIA World Factbook – Country-level geopolitical and socio-economic data (Dataset).

#### Conflict Data

- IISS Armed Conflict Database – International Institute for Strategic Studies conflict data (Dataset).
- Uppsala Conflict Data Program (UCDP) – Armed conflict location and event dataset (Dataset).
- ACLED Data – Armed Conflict Location and Event Data Project (Dataset).

#### Investigative Journalism

- Bellingcat Investigation Resources – Investigative OSINT tools and guides (Resource).
- OCCRP Aleph Database – Organized crime and corruption reporting database (Database).
- ICIJ Offshore Leaks Database – International Consortium of Investigative Journalists leaks data (Database).
- Wikileaks Public Archives – Leaked documents database (Archive).

#### Public Data & Research

- Google Public Data Explorer – Exploration tool for public datasets (Portal).
- Knoema Data Atlas – Open global data platform for economic, industry, and socio-economic datasets (Portal).
- Humanitarian Data Exchange (HDX) – Open platform for humanitarian datasets (Portal).
- AidData Research Releases – Geopolitical aid data and transparency datasets (Dataset).

### Dark Web & Illicit Markets

#### Market Monitoring

- DarkOwl Vision API – Search and monitor dark web content and marketplaces (API).
- Flashpoint API – Threat intelligence platform with deep/dark web coverage (API).
- Intel 471 Collections – Cybercrime and underground community monitoring (Commercial).
- KELA Darkbeam API – Dark web threat monitoring and alerts (API).
- Recorded Future Dark Web – Dark web intelligence and monitoring feeds (Commercial).
- DARKINT Market Monitors – Monitoring of major dark web markets (Feed).
- DarkNet Live – Status monitoring of darknet markets and forums (Feed).

#### Leak Sites

- Ransomware Leak Sites Monitoring – Tracking extortion and ransomware group leak portals (Monitor).

#### Forums & Communities

- OnionScan Results Archive – Historical scanning results of onion services (Archive).
- AIL Framework Feeds – Analysis Information Leak framework for monitoring leaks (Feed).
- DarkFail Market Status – Darknet market uptime and availability tracker (Feed).
- DarkNet Trust Forums – Monitoring of reputation and trust forums in dark web communities (Scraper).

#### Leaks & Archives

- DDoSecrets Public Collections – Distributed Denial of Secrets leaked datasets (Archive).
- DeepDotWeb Archive (Mirrors) – Archived information on dark web markets (Archive).
- CryptBB Forum Archives – Archived discussions from CryptBB forums (Archive).

### News, Media & Social Listening

#### Mainstream News

- AP News API – Associated Press newswire content (API).
- Reuters News API – Reuters global news coverage (API).
- Bloomberg Terminal News – Bloomberg newswire and financial analysis (Commercial).
- LexisNexis News API – LexisNexis aggregated news and publications (Commercial).

#### News Aggregation

- NewsAPI.org – Aggregator for global online news outlets (API).
- Meltwater News API – News and media monitoring platform (Commercial).
- Brandwatch Social Data – Media and social listening platform (Commercial).
- Talkwalker Quick Search – Social media analytics and monitoring (Commercial).

#### Social Platforms

- CrowdTangle API (Meta) – Access to public content on Facebook and Instagram (API).
- Reddit API – Access to subreddits like r/netsec, r/cybersecurity (API).
- Hacker News (YCombinator) API – Access to YCombinator’s Hacker News community (API).

#### Cybersecurity News

- BleepingComputer RSS – Cybersecurity and malware news (RSS).
- DarkReading RSS – Cybersecurity industry coverage (RSS).
- KrebsOnSecurity RSS – Independent investigative cybersecurity journalism (RSS).
- The Hacker News RSS – Cybersecurity-focused online news site (RSS).
- Threatpost RSS – Cybersecurity news publication (RSS).
- SC Magazine RSS – Security magazine reporting (RSS).
- TechCrunch Cyber RSS – Cybersecurity section of TechCrunch (RSS).
- Wired Threat Level RSS – Cybersecurity coverage from Wired (RSS).

#### Broadcast Media

- BBC Monitoring Service – Global broadcast monitoring service (Commercial).
- CNN RSS Feeds – News feed access from CNN (RSS).
- Al Jazeera RSS – News feed from Al Jazeera (RSS).
- Xinhua News API – Chinese state media feed (API).

### Open Data & Research Repositories

#### Public Datasets

- Kaggle Public Datasets – Community datasets for machine learning and analysis (Repo).
- AWS Registry of Open Data – Open data hosted in Amazon cloud (Repo).
- Google Dataset Search – Search engine for open datasets across repositories (Search).
- Zenodo – Open research repository hosted by CERN (Repo).
- Figshare – Open access data repository for research outputs (Repo).
- Dryad Digital Repository – Open-source data repository for scientific data (Repo).

#### Academic & Research

- arXiv Preprint Server – Open preprint server, CS and cybersecurity sections (Repo).
- SSRN Cybersecurity Papers – Social Science Research Network cybersecurity papers (Repo).

#### Security & Vulnerability

- CVE Details Database – Public vulnerability database with searchable CVEs (Feed).
- Exploit-DB Feeds – Exploit Database maintained by Offensive Security (Feed).
- Packet Storm Security – Exploit and advisory publication site (Feed).
- Vulners.com API – Vulnerability and exploit aggregator (API).
- MISP Galaxy/Taxonomy Feeds – Community MISP taxonomies and OSINT feeds (Feed).

#### Government & Policy

- NIST Public Data Resources – National Institute of Standards datasets (Repo).
- ENISA Threat Landscape Reports – European Union cybersecurity agency reports (Report).
- INTERPOL Cybercrime Reports – International law enforcement cybercrime publications (Report).
- Europol Public Info – Reports and advisories from Europol (Report).
- UNODC Reports – UN Office on Drugs and Crime public reports (Report).

#### Global Indices

- World Economic Forum Data – Data from WEF Global Risk Reports (Dataset).
- Transparency International Data – Corruption perception index and global governance metrics (Dataset).
- Freedom House Datasets – Democracy and freedom indices worldwide (Dataset).

#### Linked Data & Archives

- Wikidata Query Service – Structured linked open data from Wikimedia (API).
- DBpedia Datasets – Semantic web extraction from Wikipedia (Dataset).
- Common Crawl – Open web-scale crawl dataset for NLP and research (Dataset).
- Internet Archive Wayback Machine – Archived websites with CDX indexes (Archive).
- Library of Congress Digital Collections – Digital collection datasets from Library of Congress (Dataset).

### Blockchain & Cryptocurrency Intelligence

#### Abuse & Scams

- Bitcoin Abuse Database – Reports of bitcoin addresses used for scams or abuse (API).
- CryptoScamDB – Database of cryptocurrency-related scams and fraud (API).

#### Chain Explorers

- Blockchain.com Explorer API – Bitcoin blockchain explorer and API (API).
- Etherscan API – Ethereum blockchain explorer and API (API).
- Solscan – Solana blockchain explorer (API).
- Blockchair – Multi-chain blockchain explorer (API).

#### Chain Analytics

- Dune Analytics – Blockchain analytics platform with public dashboards (Portal).
- Glassnode – On-chain analytics and metrics (API).
- Santiment – Crypto market sentiment and on-chain data (API).
- Whale Alert – Large blockchain transaction monitoring (API).
- DeFiLlama – Decentralized finance protocol analytics and stats (Portal).
- Arkham Intelligence – Blockchain analytics with entity clustering (API).
- TRM Labs – Blockchain risk and compliance monitoring (Commercial).
- Chainalysis Reactor – Commercial blockchain forensic and compliance suite (Commercial).
- Elliptic – Blockchain analytics and compliance datasets (Commercial).

#### Address & Wallets

- WalletExplorer – Bitcoin wallet clustering and address attribution (Tool).
- BitcoinWhosWho – Bitcoin address intelligence and abuse reports (Portal).
- AML Bot Transaction Monitoring – AML risk scores for crypto transactions (API).

#### Security & Audits

- CertiK Skynet Alerts – Security monitoring of blockchain protocols and smart contracts (Feed).
- SlowMist Hacked Crypto – Tracking blockchain hacks and exploits (Feed).
- Crystal Blockchain Analytics – Blockchain transaction tracking and AML tool (Commercial).

### Supplemental & Niche Sources

#### Web Traffic & Popularity

- Alexa Top Sites API – Most visited websites ranking (API).
- SimilarWeb API – Website traffic and engagement analytics (API).
- Majestic Million – Ranking of top websites by backlinks (Dataset).
- Moz Link Explorer API – Backlink and domain authority data (API).
- Cisco Umbrella Popularity List – Top domains queried by Cisco Umbrella DNS (Feed).

#### Developer Ecosystem

- GitHub Public Events API – Stream of public GitHub activity events (API).
- GitLab Public Activity Stream – Stream of GitLab project activity (API).
- NPM Security Advisories – JavaScript ecosystem vulnerability advisories (Feed).
- PyPI Advisory Database – Python package vulnerability advisories (Feed).
- Ruby Advisory Database – RubyGem security advisories (Feed).
- RustSec Advisory Database – Rust ecosystem vulnerability advisories (Feed).
- OSS-Fuzz Vulnerability Reports – Vulnerability reports from Google OSS-Fuzz (Feed).
- Snyk Vulnerability DB – Commercial vulnerability database (Commercial).
- Docker Hub Vulnerability Scanning – Container vulnerability scanning data (Feed).
- WPScan Vulnerability Database – WordPress plugin and theme vulnerabilities (Feed).

#### Environment & Science

- National Weather Service API – Meteorological and hazard data (API).
- USGS Earthquake Feeds – Seismic hazard feeds from US Geological Survey (Feed).
- OpenAQ Air Quality API – Global open air quality monitoring data (API).
- Our World in Data – Global datasets on environment, health, and society (Dataset).

#### Geospatial & Transport

- FlightAware AeroAPI – Flight tracking and status data (API).
- MarineTraffic API – Real-time vessel tracking (API).
- FlightRadar24 API – Flight radar data feeds (API).
- ADS-B Exchange – Crowdsourced flight tracking data (Feed).
- OpenSky Network API – Global air traffic surveillance data (API).
- Satellite Imagery Providers (Planet, Maxar – Free Tiers) – Satellite imagery from commercial providers (limited free access) (API).
- Global Forest Watch Data – Deforestation and land-use change monitoring (Dataset).
- Humanitarian OpenStreetMap Team – Crowdsourced geospatial humanitarian mapping (Dataset).
- Geonames API – Global geographical database (API).
- OpenStreetMap Overpass API – Query and extract OSM geospatial data (API).

