export type RSSPAttestationType =
  | 'dp-budget'
  | 'deletion-receipt'
  | 'transparency-proof'
  | 'consent-receipt';

export interface RSSPQueryTemplate {
  id: string;
  title: string;
  statementHash: string;
  redactions: string[];
}

export interface RSSPVerification {
  algorithm: 'ed25519';
  signature: string;
  message: string;
}

export interface RSSPAttestation {
  id: string;
  type: RSSPAttestationType;
  title: string;
  summary: string;
  issuedAt: string;
  jurisdiction: string[];
  retentionPolicy: string;
  payload: Record<string, unknown>;
  payloadHash: string;
  exportPack: string; // base64 encoded JSON payload
  exportHash: string;
  verification: RSSPVerification;
}

export interface RSSPDataset {
  publicKey: string;
  attestations: RSSPAttestation[];
}

export const RSSP_DATASET: RSSPDataset = {
  publicKey:
    '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAFQ8gUteTYipyypLACfsa49l5Yb002TYaTCOuNs6z+98=\n-----END PUBLIC KEY-----\n',
  attestations: [
    {
      id: 'dp-2024-q4',
      type: 'dp-budget',
      title: 'Differential Privacy Budget Ledger — Q4 2024',
      summary: 'Quarterly consumption record across regulated analytics enclaves.',
      issuedAt: '2025-01-12T18:22:00Z',
      jurisdiction: ['EU', 'US'],
      retentionPolicy: '12 months',
      payload: {
        controller: 'Summit Intelligence Platform',
        enclave: 'analytics/dp/govpack',
        ledger: [
          {
            allocationId: 'alloc-a1',
            purposeHash: '123bc8725c182f9aeb1f7511285348158026a3b9c207b11805f9777fc3aedd2a',
            budgetEpsilon: 4,
            spentEpsilon: 2.19,
            remainingEpsilon: 1.81,
            lastAccess: '2024-12-22T05:11:00Z',
          },
          {
            allocationId: 'alloc-b3',
            purposeHash: '657c7f6b92ef20ba2c8fca7b282a2c10f38beecf93d78c7464c038286e5d78cd',
            budgetEpsilon: 2,
            spentEpsilon: 0.74,
            remainingEpsilon: 1.26,
            lastAccess: '2024-12-29T11:40:00Z',
          },
        ],
        queryTemplates: [
          {
            id: 'dp-breach-hotline',
            title: 'Regulator Hotline Risk Sweep',
            statementHash:
              'ef5b093b1d5ab28dfbdd678c356f782e7125fefbc799316db7ace1f79c5982c4',
            redactions: ['bucket'],
          },
          {
            id: 'dp-incidents-weekly',
            title: 'Weekly Incident Synopsis',
            statementHash:
              '9cf6d3b330364e9dfbfa1b61d3cb6a83d92a14f8e9a96f19a31ae7282ee92809',
            redactions: ['incident_id'],
          },
        ],
        controls: {
          maxEpsilonPerRequest: 0.5,
          reviewWindowDays: 30,
          auditors: [
            '9ccb3ae5a0fe468cc238425fe3967a97ff43b572a74d4f1e48fc112a261eead1',
            '5d839c29d320aaf3b899735ca6199ee7597bc27b8238b2e278394db52017d5c1',
          ],
        },
      },
      payloadHash: '922a6bbbcd2d47814b9bbf56ee41bd15a96c8da211f3a45e66f98c1174662f92',
      exportPack:
        'ewogICJpZCI6ICJkcC0yMDI0LXEyIiwKICAidHlwZSI6ICJkcC1idWRnZXQiLAogICJpc3N1ZWRBdCI6ICIyMDI1LTAxLTEyVDE4OjIyOjAwWiIsCiAgInBheWxvYWQiOiB7CiAgICAiY29udHJvbGxlciI6ICJTdW1taXQgSW50ZWxsaWdlbmNlIFBsYXRmb3JtIiwKICAgICJlbmNsYXZlIjogImFuYWx5dGljcy9kcC9nb3ZwYWNrIiwKICAgICJsZWRnZXIiOiBbCiAgICAgIHsKICAgICAgICAiYWxsb2NhdGlvbklkIjogImFsbG9jLWExIiwKICAgICAgICAicHVycG9zZUhhc2giOiAiMTIzYmM4NzI1YzE4MmY5YWViMWY3NTExMjg1MzQ4MTU4MDI2YTNiOWMyMDdiMTE4MDVmOTc3N2ZjM2FlZGQyYSIsCiAgICAgICAgImJ1ZGdldEVwc2lsb24iOiA0LAogICAgICAgICJzcGVudEVwc2lsb24iOiAyLjE5LAogICAgICAgICJyZW1haW5pbmdFcHNpbG9uIjogMS44MSwKICAgICAgICAibGFzdEFjY2VzcyI6ICIyMDI0LTEyLTIyVDA1OjExOjAwWiIKICAgICAgfSwKICAgICAgewogICAgICAgICJhbGxvY2F0aW9uSWQiOiAiYWxsb2MtYjMiLAogICAgICAgICJwdXJwb3NlSGFzaCI6ICI2NTdjN2Y2YjkyZWYyMGJhMmM4ZmNhN2IyODJhMmMxMGYzOGJlZWNmOTNkNzhjNzQ2NGMwMzgyODZlNWQ3OGNkIiwKICAgICAgICAiYnVkZ2V0RXBzaWxvbiI6IDIsCiAgICAgICAgInNwZW50RXBzaWxvbiI6IDAuNzQsCiAgICAgICAgInJlbWFpbmluZ0Vwc2lsb24iOiAxLjI2LAogICAgICAgICJsYXN0QWNjZXNzIjogIjIwMjQtMTItMjlUMTE6NDA6MDBaIgogICAgICB9CiAgICBdLAogICAgInF1ZXJ5VGVtcGxhdGVzIjogWwogICAgICB7CiAgICAgICAgImlkIjogImRwLWJyZWFjaC1ob3RsaW5lIiwKICAgICAgICAidGl0bGUiOiAiUmVndWxhdG9yIEhvdGxpbmUgUmlzayBTd2VlcCIsCiAgICAgICAgInN0YXRlbWVudEhhc2giOiAiZWY1YjA5M2IxZDVhYjI4ZGZiZGQ2NzhjMzU2Zjc4MmU3MTI1ZmVmYmM3OTkzMTZkYjdkYWNlMWY3OWM1OTgyYzQiLAogICAgICAgICJyZWRhY3Rpb25zIjogWwogICAgICAgICAgImJ1Y2tldCIKICAgICAgICBdCiAgICAgIH0sCiAgICAgIHsKICAgICAgICAiaWQiOiAiZHAt[...truncated...]',
      exportHash: 'd42518bd0e2a2251ceb3c0eb49f21f01c3a8fd020bd89c17fcc9942ec85977f3',
      verification: {
        algorithm: 'ed25519',
        signature: 'nYzMa87KQGkJcX2Kt1ES9bcMBcJ6ZJ+rM+dFXOSV0/1mje4CrUEkvU+CURr8fReA/3DJnA0ekYoZLuGUK/KzDQ==',
        message:
          '922a6bbbcd2d47814b9bbf56ee41bd15a96c8da211f3a45e66f98c1174662f92:d42518bd0e2a2251ceb3c0eb49f21f01c3a8fd020bd89c17fcc9942ec85977f3',
      },
    },
    {
      id: 'del-2025-jan',
      type: 'deletion-receipt',
      title: 'Deletion Receipts — January 2025',
      summary: 'Hash-anchored confirmation of subject erasure actions.',
      issuedAt: '2025-02-01T09:05:00Z',
      jurisdiction: ['US', 'APAC'],
      retentionPolicy: '6 years',
      payload: {
        controller: 'Summit Intelligence Platform',
        erasureRequests: [
          {
            requestHash: 'a93e2f612a0de3b62c1ca19149a821174dec7b5e62b08071e8d56da4215e7c71',
            subjectHash: 'bb128ca2e1abc5f29e998ed0aa1418e37f0ffb09ea9886c9584ceba14da0f1d3',
            dataStores: [
              'e7e3cda4e731d48942e43d08dcb4dfb14cf2ccf1b59619b6d4604d3a3dea4f3e',
              '44e32d2b78b595dc1a522190b387f5c4c6f36597ff81b6d0e4df54d944ca3c2d',
            ],
            completedAt: '2025-01-14T13:44:00Z',
            verifier: '29c0f99d4226cf92af057ac22174cf8be514901df679fd2d94d4d67f3befc72f',
          },
          {
            requestHash: 'aabdf3106abce358b8eed09c434517962d85b768202386fc7dcc39621dbdb0f3',
            subjectHash: 'fdfd7b676c4c009c301686df4f95b3179aef2d51c62bb11212e08ff4d2b1212f',
            dataStores: [
              '09e704ce6c90f83dd20561d04b72db385007549c21efd7eecde59e1cb5b44f52',
              'b69375a0b5f12b6f09a7d229b6ac6f0f0cfb8f9f15893d54d2bdeee8735394af',
            ],
            completedAt: '2025-01-18T21:07:00Z',
            verifier: '780046f7fa0c772998b4439b6d8642171d3dcf67cccdd1f873eb1249078a21bb',
          },
        ],
        queryTemplates: [
          {
            id: 'deletion-proof',
            title: 'Deletion Proof Replay',
            statementHash:
              'd3173820f9b4c8f37e54d7af14236eb9462750ca7ab77ba7867815a280934900',
            redactions: ['request_id'],
          },
        ],
        controls: {
          slaHours: 72,
          dualControl: true,
          auditTrail: '7f0a673f249f5146987430a3f780b8a9846beb3dd6fb700c7f6fefb9c6f7be32',
        },
      },
      payloadHash: '4525d51289e86bb7287d5021aa1cced68adb4ef6ecc1a2748e871f423b94aceb',
      exportPack:
        'ewogICJpZCI6ICJkZWwtMjAyNS1qYW4iLAogICJ0eXBlIjogImRlbGV0aW9uLXJlY2VpcHQiLAogICJpc3N1ZWRBdCI6ICIyMDI1LTAyLTAxVDA5OjA1OjAwWiIsCiAgInBheWxvYWQiOiB7CiAgICAiY29udHJvbGxlciI6ICJTdW1taXQgSW50ZWxsaWdlbmNlIFBsYXRmb3JtIiwKICAgICJlcmFzdXJlUmVxdWVzdHMiOiBbCiAgICAgIHsKICAgICAgICAicmVxdWVzdEhhc2giOiAiYTkzZTJmNjEyYTBkZTNiNjJjMWNhMTkxNDlhODIxMTc0ZGVjN2I1ZTYyYjA4MDcxZThkNTZkYTQyMTVlN2M3MSIsCiAgICAgICAgInN1YmplY3RIYXNoIjogImJiMTI4Y2EyZTFhYmM1ZjI5ZTk5OGVkMGFhMTQxOGUzN2YwZmZiMDllYTk4ODZjOTU4NGNlYmExNGRhMGYxZDMiLAogICAgICAgICJkYXRhU3RvcmVzIjogWwogICAgICAgICAgImU3ZTNjZGE0ZTczMWQ0ODk0MmU0M2QwOGRjYjRkZmIxNGNmMzY1OTdmZjgxYjZkMGU0ZGY1NGQ5NDRjYTNjMmQiLAogICAgICAgICAgIjQ0ZTMyZDJiNzhiNTk1ZGMxYTUyMjE5MGIzODdmNWM0YzZmMzY1OTdmZjgxYjZkMGU0ZGY1NGQ5NDRjYTNjMmQiCiAgICAgICAgXSwKICAgICAgICAiY29tcGxldGVkQXQiOiAiMjAyNS0wMS0xNFQxMzo0NDowMFoiLAogICAgICAgICJ2ZXJpZmllciI6ICIyOWMwZjk5ZDQyMjZjZjkyYWYwNTdhYzIyMTc0Y2Y4YmU1MTQ5MDFkZjY3OWZkMmQ5NGQ0ZDY3ZjNiZWZjNzJmIgogICAgICB9LAogICAgICB7CiAgICAgICAgInJlcXVlc3RIYXNoIjogImFhYmRmMzEwNmFiY2UzNThiOGVlZDA5YzQzNDUxNzk2MmQ4NWI3NjgyMDIzODZmYzdkYzM5NjIxZGJkYjBmMyIsCiAgICAgICAgInN1YmplY3RIYXNoIjogImZkZmQ3YjY3NmM0YzAwOWMzMDE2ODZkZjRmOTViMzE3OWFlZjJkNTFjNjJiYjExMjEyZTA4ZmY0ZDJiMTIxMmYiLAogICAgICAgICJkYXRhU3RvcmVzIjogWwogICAgICAgICAgIjA5ZTcwNGNlNmM5MGY4M2QyMDU2MWQwNGI3MmRiMzg1MDA3NTQ5YzIxZWZkN2VlY2RlNTllMWNiNWI0NGY1MiIsCiAgICAgICAgICAiYjY5Mzc1YTBiNWYxMmI2ZjA5YTdkMjI5YjZhYzZmMGYwY2ZiOGY5ZjE1ODkzZDU0ZDJiZGVlZTg3MzUzOTRhZiIKICAgICAgICBdLAogICAgICAgICJjb21wbGV0ZWRBdCI6ICIyMDI1LTAxLTE4VDIxOjA3OjAwWiIsCiAgICAgICAgInZlcmlmaWVyIjogIjc4MDA0NmY3ZmEwYzc3Mjk5OGI0NDM5YjZkODY0MjE3MWQzZGNmNjdjY2NkZDFmODczZWIxMjQ5MDc4YTIxYmIiCiAgICAgIH0KICAgIF0sCiAgICAicXVlcnlUZW1wbGF0ZXMiOiBbCiAgICAgIHsKICAgICAgICAiaWQiOiAiZGVsZXRpb24tcHJvb2YiLAogICAgICAgICJ0aXRsZSI6ICJEZWxldGlvbiBQcm9vZiBSZXBsYXkiLAogICAgICAgICJzdGF0ZW1lbnRIYXNoIjogImQzMTczODIwZjliNGM4ZjM3ZTU0ZDdhZjE0MjM2ZWI5NDYyNzUwY2E3YWI3N2JhNzg2NzgxNWEyODA5MzQ5MDAiLAogICAgICAgICJyZWRhY3Rpb25zIjogWwogICAgICAgICAgInJlcXVlc3RfaWQiCiAgICAgICAgXQogICAgICB9CiAgICBdLAogICAgImNvbnRyb2xzIjogewogICAgICAic2xhSG91cnMiOiA3MiwKICAgICAgImR1YWxDb250cm9sIjogdHJ1ZSwKICAgICAgImF1ZGl0VHJhaWwiOiAiN2YwYTY3M2YyNDlmNTE0Njk4NzQzMGEzZjc4MGI4YTk4NDZiZWIzZGQ2ZmI3MDBjN2Y2ZmVmYjljNmY3YmUzMiIKICAgIH0KICB9LAogICJjb250cm9scyI6IHsKICAgICJzbGFIb3VycyI6IDcyLAogICAgImR1YWxDb250cm9sIjogdHJ1ZSwKICAgICJhdWRpdFRyYWlsIjogIjd mMGE2NzNmMjQ5ZjUxNDY5ODc0MzBhM2Y3ODBiOGE5ODQ2YmViM2RkNmZiNzAwYzdmNmZlZmI5YzZmN2JlMzIiCiAgfSwKICAicXVlcnlUZW1wbGF0ZXMiOiBbCiAgICB7CiAgICAgICJpZCI6ICJkZWxldGlvbi1wcm9vZiIsCiAgICAgICJ0aXRsZSI6ICJEZWxldGlvbiBQcm9vZiBSZXBsYXkiLAogICAgICAic3RhdGVtZW50SGFzaCI6ICJkMzE3MzgyMGY5YjRjOGYzN2U1NGQ3YWYxNDIzNmViOTQ2Mjc1MGNhN2FiNzdiYTc4Njc4MTVhMjgwOTM0OTAwIiwKICAgICAgInJlZGFjdGlvbnMiOiBbCiAgICAgICAgInJlcXVlc3RfaWQiCiAgICAgIF0KICAgIH0KICBdCn0=',
      exportHash: '70e30c8514d922abc9789b89ce81d8559dedc444ab27b566604a87ef92838160',
      verification: {
        algorithm: 'ed25519',
        signature: '1uhLDeE4BBXeK0D0APSoY1C5ABNS8diP88V729sCgNJJRegFp2vtzzMhzq07vVIyYDdidnqCuxWeUwM6fDPmBA==',
        message:
          '4525d51289e86bb7287d5021aa1cced68adb4ef6ecc1a2748e871f423b94aceb:70e30c8514d922abc9789b89ce81d8559dedc444ab27b566604a87ef92838160',
      },
    },
    {
      id: 'tlp-2025-q1',
      type: 'transparency-proof',
      title: 'Transparency Log Proof — Q1 2025',
      summary: 'Merkle proofs binding API access to immutable transparency log.',
      issuedAt: '2025-03-31T23:00:00Z',
      jurisdiction: ['Global'],
      retentionPolicy: 'Indefinite (WORM chain)',
      payload: {
        logId: 'worm-ledger-reg-01',
        merkleRoot: '8b00127cefa316c26fc36315df6afff1e33092a6e4cb126f31d6444aaafc3ee8',
        entries: [
          {
            leafHash: '01a869745684229c440f9b8c9b12f629699d52e2f625ded7774664e833815195',
            path: [
              'f046299cb8e5091fa5191716b939491b5dec0554bca65addb716a8f916563237',
              '9ae6108ea4a03a5fb30ab058550024ab62888ac2a0a36853d23af824ec938d93',
              'cf12143363bf7e5192d38d6ac816190bd9f15f37ba7dec5bfdbc1b0931b607b7',
            ],
            replayQueryHash: '508cc00cd024bed8cf5cd096fe9742b5d1949b8a925f59474181850113574661',
          },
        ],
        queryTemplates: [
          {
            id: 'merkle-verify',
            title: 'Merkle Branch Verification',
            statementHash:
              '63691b97f52b4c5edd77cb57e0e02ffc65b37d8cb4fbc3221fd7158a8261ad18',
            redactions: ['leaf_hash'],
          },
        ],
        controls: {
          appendOnly: true,
          replication: ['eu-central-1', 'us-gov-west-1'],
          retentionChecksums: 'ceecdc256c8a7bb51fc52c4b9a6263ef51b345ad1c7e52a19c785a4a18cb00b5',
        },
      },
      payloadHash: 'a53146320e6045ed0ef61fdbde1162f7dc7299b12db1b5211c8c6d8d96ddc3bb',
      exportPack:
        'ewogICJpZCI6ICJ0bHAtMjAyNS1xMSIsCiAgInR5cGUiOiAidHJhbnNwYXJlbmN5LXByb29mIiwKICAiaXNzdWVkQXQiOiAiMjAyNS0wMy0zMVQyMzowMDowMFoiLAogICJwYXlsb2FkIjogewogICAgImxvZ0lkIjogIndvcm0tbGVkZ2VyLXJlZy0wMSIsCiAgICAibWVya2xlUm9vdCI6ICI4YjAwMTI3Y2VmYTMxNmMyNmZjMzYzMWZmNGZmZjFlMzMwOTJhNmU0Y2IxMjZmMzFkNjQ0NGFhYWZjM2VlOGNhIiwKICAgICJlbnRyaWVzIjogWwogICAgICB7CiAgICAgICAgImxlYWZIYXNoIjogIjAxYTg2OTc0NTY4NDIyOWM0NDBmOWI4YzliMTJmNjI5Njk5ZDUyZTJmNjI1ZGVkZTc3NDY2NGU4MzM4MTUxOTUiLAogICAgICAgICJwYXRoIjogWwogICAgICAgICAgImYwNDYyOTljYjhlNTA5MWZhNTE5MTcxNmI5Mzk0OTFiNWRlYzA1NTRiY2E2NWFkZGI3MTZhOGY5MTY1NjIzMjciLAogICAgICAgICAgIjlhZTYxMDhlYTRhMDNhNWZiMzBhYjA1ODU1MDAyNGFiNjI4ODhhYzJhMGEzNjg1M2QyM2FmODI0ZWM5MzhkOTMiLAogICAgICAgICAgImNmMTIxNDMzNjNiZjdlNTE5MmQzOGQ2YWM4MTYxOTBiZDlmMTVmMzdiYTdkZWM1YmZkYmMxYjA5MzFiNjA3YjciCiAgICAgICAgXSwKICAgICAgICAicmVwbGF5UXVlcnlIYXNoIjogIjUwOGNjMDBjZDAyNGJlZDhjZjVjZDA5NmZlOTc0MmI1ZDE5NDliOGE5MjVmNTk0NzQxODE4NTAxMTM1NzQ2NjEiCiAgICAgIH0KICAgIF0sCiAgICAicXVlcnlUZW1wbGF0ZXMiOiBbCiAgICAgIHsKICAgICAgICAiaWQiOiAibWVya2xlLXZlcmlmeSIsCiAgICAgICAgInRpdGxlIjogIk1lcmtsZSBCcmFuY2ggVmVyaWZpY2F0aW9uIiwKICAgICAgICAic3RhdGVtZW50SGFzaCI6ICI2MzY5MWI5N2Y1MmI0YzVlZGQ3N2NiNTdlMGUwMmZmYzY1YjM3ZDhjYjRmYmMzMjIxZmQ3MTU4YTgyNjFhZDE4IiwKICAgICAgICAicmVkYWN0aW9ucyI6IFsKICAgICAgICAgICJsZWFmX2hhc2giCiAgICAgICAgXQogICAgICB9CiAgICBdLAogICAgImNvbnRyb2xzIjogewogICAgICAiYXBwZW5kT25seSI6IHRydWUsCiAgICAgICJyZXBsaWNhdGlvbiI6IFsKICAgICAgICAiZXUtY2VudHJhbC0xIiwKICAgICAgICAidXMtZ292LXdlc3QtMSIKICAgICAgXSwKICAgICAgInJldGVudGlvbkNoZWNrc3VtcyI6ICJjZWVjZGMyNTZjOGE3YmI1MWZjNTJjNGI5YTYyNjNlZjUxYjM0NWFkMWM3ZTUyYTE5Yzc4NWE0YTE4Y2IwMGI1IgogICAgfQogIH0sCiAgImNvbnRyb2xzIjogewogICAgImFwcGVuZE9ubHkiOiB0cnVlLAogICAgInJlcGxpY2F0aW9uIjogWwogICAgICAiZXUtY2VudHJhbC0xIiwKICAgICAgInVzLWdvdi13ZXN0LTEiCiAgICBdLAogICAgInJldGVudGlvbkNoZWNrc3VtcyI6ICJjZWVjZGMyNTZjOGE3YmI1MWZjNTJjNGI5YTYyNjNlZjUxYjM0NWFkMWM3ZTUyYTE5Yzc4NWE0YTE4Y2IwMGI1IgogIH0sCiAgInF1ZXJ5VGVtcGxhdGVzIjogWwogICAgewogICAgICAiaWQiOiAibWVya2xlLXZlcmlmeSIsCiAgICAgICJ0aXRsZSI6ICJNZXJrbGUgQnJhbmNoIFZlcmlmaWNhdGlvbiIsCiAgICAgICJzdGF0ZW1lbnRIYXNoIjogIjYzNjkxYjk3ZjUyYjRjNWVkZDc3Y2I1N2UwZTAyZmZjNjViMzdkOGNiNGZiYzMyMjFmZDcxNThhODI2MWFkMTgiLAogICAgICAicmVkYWN0aW9ucyI6IFsKICAgICAgICAibGVhZl9oYXNoIgogICAgICBdCiAgICB9CiAgXQp9',
      exportHash: '72a164d4ac18d7506a32e0b67de8227ee7198afdaa76a8f6f44e1d37f11c0661',
      verification: {
        algorithm: 'ed25519',
        signature: 'Ta1n+3ODKGUwg36KlJBiYYP0QW6+6T0vLgkLcB5rJFYoDoPQgFoBXls0fiiuLa3OrwUPRVDYlkPQaIFAPT+OBg==',
        message:
          'a53146320e6045ed0ef61fdbde1162f7dc7299b12db1b5211c8c6d8d96ddc3bb:72a164d4ac18d7506a32e0b67de8227ee7198afdaa76a8f6f44e1d37f11c0661',
      },
    },
    {
      id: 'consent-2025',
      type: 'consent-receipt',
      title: 'Consent Receipts — Regulated Research Programs',
      summary: 'Jurisdictional consent attestations for regulated research analytics.',
      issuedAt: '2025-02-20T14:32:00Z',
      jurisdiction: ['EU', 'UK'],
      retentionPolicy: 'Until withdrawal + 24 months',
      payload: {
        controller: 'Summit Intelligence Platform',
        lawfulBasis: 'GDPR Art. 6(1)(a) — Consent',
        receipts: [
          {
            consentHash: '6a126753bbd3ffb782d2f4908892a3c5496916095efc8a7c288781525aa8a3c5',
            captureMethod: 'Signed portal consent (audited)',
            scopeHash: '7b4b91dc6f8cd041165c6318b7041d27bc6b13e297426fc56bfce2b0cf6da0d0',
            withdrawnAt: null,
            expiresAt: '2026-02-20T00:00:00Z',
          },
          {
            consentHash: '476ae53b75a348d9538548eb2732488847aeac6bfbe80a41e046f68300940d91',
            captureMethod: 'Delegated regulator bridge',
            scopeHash: '4a53a4d3d9e2aeb7cc3ad08c7aab9283e6dd02fe04d30f79ad9f8c27e3fb17e0',
            withdrawnAt: '2025-11-02T08:00:00Z',
            expiresAt: '2025-11-02T08:00:00Z',
          },
        ],
        queryTemplates: [
          {
            id: 'consent-scope-audit',
            title: 'Scope Coverage Audit',
            statementHash:
              'becf7df1842ca2ce79445a688b4900cc44d2bafe27b20919b05858e0a011f5ab',
            redactions: ['consent_hash'],
          },
        ],
        controls: {
          withdrawalHotline: true,
          evidenceLedger: 'e3e7fea9049cebc00ade89ff5a72efdf456093f78f8cc18599217e8b188934f4',
          reviewCadenceDays: 90,
        },
      },
      payloadHash: 'eeb0bc15f656d32173177f5fb137ae4368266117250f727cab2d2c8ccbba3ebe',
      exportPack:
        'ewogICJpZCI6ICJjb25zZW50LTIwMjUiLAogICJ0eXBlIjogImNvbnNlbnQtcmVjZWlwdCIsCiAgImlzc3VlZEF0IjogIjIwMjUtMDItMjBUMTQ6MzI6MDBaIiwKICAicGF5bG9hZCI6IHsKICAgICJjb250cm9sbGVyIjogIlN1bW1pdCBJbnRlbGxpZ2VuY2UgUGxhdGZvcm0iLAogICAgImxhd2Z1bEJhc2lzIjogIkdEUFIgQXJ0LiA2KDEpKGEpIOKAlCBDb25zZW50IiwKICAgICJyZWNlaXB0cyI6IFsKICAgICAgewogICAgICAgICJjb25zZW50SGFzaCI6ICI2YTEyNjc1M2JiZDNmZmI3ODJkMmY0OTA4ODkyYTNjNTQ5NjkxNjA5NWVmYzhhN2MyODg3ODE1MjVhYThhM2M1IiwKICAgICAgICAiY2FwdHVyZU1ldGhvZCI6ICJTaWduZWQgcG9ydGFsIGNvbnNlbnQgKGF1ZGl0ZWQpIiwKICAgICAgICAic2NvcGVIYXNoIjogIjdiNGI5MWRjNmY4Y2QwNDExNjVjNjMxOGI3MDQxZDI3YmM2YjEzZTI5NzQyNmZjNTZiZmNlMmIwY2Y2ZGEwZDAiLAogICAgICAgICJ3aXRoZHJhd25BdCI6IG51bGwsCiAgICAgICAgImV4cGlyZXNBdCI6ICIyMDI2LTAyLTIwVDAwOjAwOjAwWiIKICAgICAgfSwKICAgICAgewogICAgICAgICJjb25zZW50SGFzaCI6ICI0NzZhZTUzYjc1YTM0OGQ5NTM4NTQ4ZWIyNzMyNDg4ODQ3YWVhYzZiZmJlODBhNDFlMDQ2ZjY4MzAwOTQwZDkxIiwKICAgICAgICAiY2FwdHVyZU1ldGhvZCI6ICJEZWxlZ2F0ZWQgcmVndWxhdG9yIGJyaWRnZSIsCiAgICAgICAgInNjb3BlSGFzaCI6ICI0YTUzYTRkM2Q5ZTJhZWI3Y2MzYWQwOGM3YWFiOTI4M2U2ZGQwMmZlMDRkMzBmNzlhZDlmOGMyN2UzZmIxN2UwIiwKICAgICAgICAid2l0aGRyYXduQXQiOiAiMjAyNS0xMS0wMlQwODowMDowMFoiLAogICAgICAgICJleHBpcmVzQXQiOiAiMjAyNS0xMS0wMlQwODowMDowMFoiCiAgICAgIH0KICAgIF0sCiAgICAicXVlcnlUZW1wbGF0ZXMiOiBbCiAgICAgIHsKICAgICAgICAiaWQiOiAiY29uc2VudC1zY29wZS1hdWRpdCIsCiAgICAgICAgInRpdGxlIjogIlNjb3BlIENvdmVyYWdlIEF1ZGl0IiwKICAgICAgICAic3RhdGVtZW50SGFzaCI6ICJiZWNmN2RmMTg0MmNhMmNlNzk0NDVhNjg4YjQ5MDBjYzQ0ZDJiYWZlMjdiMjA5MTliMDU4NThlMGEwMTFmNWFiIiwKICAgICAgICAicmVkYWN0aW9ucyI6IFsKICAgICAgICAgICJjb25zZW50X2hhc2giCiAgICAgICAgXQogICAgICB9CiAgICBdLAogICAgImNvbnRyb2xzIjogewogICAgICAid2l0aGRyYXdhbEhvdGxpbmUiOiB0cnVlLAogICAgICAiZXZpZGVuY2VMZWRnZXIiOiAiZTNlN2ZlYTkwNDljZWJjMDBhZGU4OWZmNWE3MmVmZGY0NTYwOTNmNzhmOGNjMTg1OTkyMTdlOGIxODg5MzRmNCIsCiAgICAgICJyZXZpZXdDYWRlbmNlRGF5cyI6IDkwCiAgICB9CiAgfSwKICAiY29udHJvbHMiOiB7CiAgICAid2l0aGRyYXdhbEhvdGxpbmUiOiB0cnVlLAogICAgImV2aWRlbmNlTGVkZ2VyIjogImUzZTdmZWE5MDQ5Y2ViYzAwYWRlODlmZjVhNzJlZmRmNDU2MDkzZjc4ZjhjYzE4NTk5MjE3ZThiMTg4OTM0ZjQiLAogICAgInJldmlld0NhZGVuY2VEYXlzIjogOTAKICB9LAogICJxdWVyeVRlbXBsYXRlcyI6IFsKICAgIHsKICAgICAgImlkIjogImNvbnNlbnQtc2NvcGUtYXVkaXQiLAogICAgICAidGl0bGUiOiAiU2NvcGUgQ292ZXJhZ2UgQXVkaXQiLAogICAgICAic3RhdGVtZW50SGFzaCI6ICJiZWNmN2RmMTg0MmNhMmNlNzk0NDVhNjg4YjQ5MDBjYzQ0ZDJiYWZlMjdiMjA5MTliMDU4NThlMGEwMTFmNWFiIiwKICAgICAgInJlZGFjdGlvbnMiOiBbCiAgICAgICAgImNvbnNlbnRfaGFzaCIKICAgICAgXQogICAgfQogIF0KfQ==',
      exportHash: '2f1707887dd52d365c7dc8820239f0da51c0debec881b1f0b714047308d5f6f5',
      verification: {
        algorithm: 'ed25519',
        signature:
          'rvB+jra6/ArcIFDRFG976GaDGT3HTn5/d0u7wRjqWTTy+T1YALjI4M5yL9jGOgyWnXhkuKZqSmiX5J9qxJtHCw==',
        message:
          'eeb0bc15f656d32173177f5fb137ae4368266117250f727cab2d2c8ccbba3ebe:2f1707887dd52d365c7dc8820239f0da51c0debec881b1f0b714047308d5f6f5',
      },
    },
  ],
};

export const RSSP_PUBLIC_KEY = RSSP_DATASET.publicKey;
export const RSSP_ATTESTATIONS = RSSP_DATASET.attestations;

export const RSSP_ATTESTATION_MAP = new Map(
  RSSP_ATTESTATIONS.map((attestation) => [attestation.id, attestation] as const),
);

export function getAttestationById(id: string): RSSPAttestation | undefined {
  return RSSP_ATTESTATION_MAP.get(id);
}
