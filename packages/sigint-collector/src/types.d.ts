/**
 * SIGINT Type Definitions
 * Training/Simulation Framework
 */
import { z } from "zod";
export declare const ClassificationLevel: z.ZodEnum<
  ["UNCLASSIFIED", "UNCLASSIFIED_FOUO", "CONFIDENTIAL", "SECRET", "TOP_SECRET", "TOP_SECRET_SCI"]
>;
export type ClassificationLevel = z.infer<typeof ClassificationLevel>;
export declare const SignalType: z.ZodEnum<
  [
    "RF_ANALOG",
    "RF_DIGITAL",
    "CELLULAR_2G",
    "CELLULAR_3G",
    "CELLULAR_4G",
    "CELLULAR_5G",
    "WIFI",
    "BLUETOOTH",
    "SATELLITE",
    "RADAR",
    "TELEMETRY",
    "NAVIGATION",
    "BROADCAST",
    "SHORTWAVE",
    "VHF",
    "UHF",
    "MICROWAVE",
    "UNKNOWN",
  ]
>;
export type SignalType = z.infer<typeof SignalType>;
export declare const IntelligenceCategory: z.ZodEnum<
  ["COMINT", "ELINT", "FISINT", "MASINT", "TECHINT", "CYBER"]
>;
export type IntelligenceCategory = z.infer<typeof IntelligenceCategory>;
export declare const ModulationType: z.ZodEnum<
  [
    "AM",
    "FM",
    "PM",
    "SSB",
    "DSB",
    "ASK",
    "FSK",
    "PSK",
    "QAM",
    "OFDM",
    "BPSK",
    "QPSK",
    "8PSK",
    "16QAM",
    "64QAM",
    "GMSK",
    "MSK",
    "GFSK",
    "SPREAD_SPECTRUM",
    "FHSS",
    "DSSS",
    "CHIRP",
    "PULSE",
    "UNKNOWN",
  ]
>;
export type ModulationType = z.infer<typeof ModulationType>;
export declare const SignalMetadata: z.ZodObject<
  {
    id: z.ZodString;
    timestamp: z.ZodDate;
    signalType: z.ZodEnum<
      [
        "RF_ANALOG",
        "RF_DIGITAL",
        "CELLULAR_2G",
        "CELLULAR_3G",
        "CELLULAR_4G",
        "CELLULAR_5G",
        "WIFI",
        "BLUETOOTH",
        "SATELLITE",
        "RADAR",
        "TELEMETRY",
        "NAVIGATION",
        "BROADCAST",
        "SHORTWAVE",
        "VHF",
        "UHF",
        "MICROWAVE",
        "UNKNOWN",
      ]
    >;
    category: z.ZodEnum<["COMINT", "ELINT", "FISINT", "MASINT", "TECHINT", "CYBER"]>;
    classification: z.ZodEnum<
      [
        "UNCLASSIFIED",
        "UNCLASSIFIED_FOUO",
        "CONFIDENTIAL",
        "SECRET",
        "TOP_SECRET",
        "TOP_SECRET_SCI",
      ]
    >;
    frequency: z.ZodOptional<z.ZodNumber>;
    bandwidth: z.ZodOptional<z.ZodNumber>;
    signalStrength: z.ZodOptional<z.ZodNumber>;
    snr: z.ZodOptional<z.ZodNumber>;
    modulation: z.ZodOptional<
      z.ZodEnum<
        [
          "AM",
          "FM",
          "PM",
          "SSB",
          "DSB",
          "ASK",
          "FSK",
          "PSK",
          "QAM",
          "OFDM",
          "BPSK",
          "QPSK",
          "8PSK",
          "16QAM",
          "64QAM",
          "GMSK",
          "MSK",
          "GFSK",
          "SPREAD_SPECTRUM",
          "FHSS",
          "DSSS",
          "CHIRP",
          "PULSE",
          "UNKNOWN",
        ]
      >
    >;
    location: z.ZodOptional<
      z.ZodObject<
        {
          latitude: z.ZodNumber;
          longitude: z.ZodNumber;
          altitude: z.ZodOptional<z.ZodNumber>;
          accuracy: z.ZodOptional<z.ZodNumber>;
          method: z.ZodEnum<["TDOA", "AOA", "RSSI", "GPS", "CELL", "HYBRID", "SIMULATED"]>;
        },
        "strip",
        z.ZodTypeAny,
        {
          latitude: number;
          longitude: number;
          method: "TDOA" | "AOA" | "RSSI" | "GPS" | "CELL" | "HYBRID" | "SIMULATED";
          altitude?: number | undefined;
          accuracy?: number | undefined;
        },
        {
          latitude: number;
          longitude: number;
          method: "TDOA" | "AOA" | "RSSI" | "GPS" | "CELL" | "HYBRID" | "SIMULATED";
          altitude?: number | undefined;
          accuracy?: number | undefined;
        }
      >
    >;
    collectorId: z.ZodString;
    sensorId: z.ZodOptional<z.ZodString>;
    missionId: z.ZodOptional<z.ZodString>;
    processed: z.ZodDefault<z.ZodBoolean>;
    priority: z.ZodDefault<z.ZodNumber>;
    legalAuthority: z.ZodOptional<z.ZodString>;
    minimized: z.ZodDefault<z.ZodBoolean>;
    isSimulated: z.ZodDefault<z.ZodBoolean>;
  },
  "strip",
  z.ZodTypeAny,
  {
    id: string;
    timestamp: Date;
    signalType:
      | "RF_ANALOG"
      | "RF_DIGITAL"
      | "CELLULAR_2G"
      | "CELLULAR_3G"
      | "CELLULAR_4G"
      | "CELLULAR_5G"
      | "WIFI"
      | "BLUETOOTH"
      | "SATELLITE"
      | "RADAR"
      | "TELEMETRY"
      | "NAVIGATION"
      | "BROADCAST"
      | "SHORTWAVE"
      | "VHF"
      | "UHF"
      | "MICROWAVE"
      | "UNKNOWN";
    category: "COMINT" | "ELINT" | "FISINT" | "MASINT" | "TECHINT" | "CYBER";
    classification:
      | "UNCLASSIFIED"
      | "UNCLASSIFIED_FOUO"
      | "CONFIDENTIAL"
      | "SECRET"
      | "TOP_SECRET"
      | "TOP_SECRET_SCI";
    collectorId: string;
    processed: boolean;
    priority: number;
    minimized: boolean;
    isSimulated: boolean;
    frequency?: number | undefined;
    bandwidth?: number | undefined;
    signalStrength?: number | undefined;
    snr?: number | undefined;
    modulation?:
      | "UNKNOWN"
      | "AM"
      | "FM"
      | "PM"
      | "SSB"
      | "DSB"
      | "ASK"
      | "FSK"
      | "PSK"
      | "QAM"
      | "OFDM"
      | "BPSK"
      | "QPSK"
      | "8PSK"
      | "16QAM"
      | "64QAM"
      | "GMSK"
      | "MSK"
      | "GFSK"
      | "SPREAD_SPECTRUM"
      | "FHSS"
      | "DSSS"
      | "CHIRP"
      | "PULSE"
      | undefined;
    location?:
      | {
          latitude: number;
          longitude: number;
          method: "TDOA" | "AOA" | "RSSI" | "GPS" | "CELL" | "HYBRID" | "SIMULATED";
          altitude?: number | undefined;
          accuracy?: number | undefined;
        }
      | undefined;
    sensorId?: string | undefined;
    missionId?: string | undefined;
    legalAuthority?: string | undefined;
  },
  {
    id: string;
    timestamp: Date;
    signalType:
      | "RF_ANALOG"
      | "RF_DIGITAL"
      | "CELLULAR_2G"
      | "CELLULAR_3G"
      | "CELLULAR_4G"
      | "CELLULAR_5G"
      | "WIFI"
      | "BLUETOOTH"
      | "SATELLITE"
      | "RADAR"
      | "TELEMETRY"
      | "NAVIGATION"
      | "BROADCAST"
      | "SHORTWAVE"
      | "VHF"
      | "UHF"
      | "MICROWAVE"
      | "UNKNOWN";
    category: "COMINT" | "ELINT" | "FISINT" | "MASINT" | "TECHINT" | "CYBER";
    classification:
      | "UNCLASSIFIED"
      | "UNCLASSIFIED_FOUO"
      | "CONFIDENTIAL"
      | "SECRET"
      | "TOP_SECRET"
      | "TOP_SECRET_SCI";
    collectorId: string;
    frequency?: number | undefined;
    bandwidth?: number | undefined;
    signalStrength?: number | undefined;
    snr?: number | undefined;
    modulation?:
      | "UNKNOWN"
      | "AM"
      | "FM"
      | "PM"
      | "SSB"
      | "DSB"
      | "ASK"
      | "FSK"
      | "PSK"
      | "QAM"
      | "OFDM"
      | "BPSK"
      | "QPSK"
      | "8PSK"
      | "16QAM"
      | "64QAM"
      | "GMSK"
      | "MSK"
      | "GFSK"
      | "SPREAD_SPECTRUM"
      | "FHSS"
      | "DSSS"
      | "CHIRP"
      | "PULSE"
      | undefined;
    location?:
      | {
          latitude: number;
          longitude: number;
          method: "TDOA" | "AOA" | "RSSI" | "GPS" | "CELL" | "HYBRID" | "SIMULATED";
          altitude?: number | undefined;
          accuracy?: number | undefined;
        }
      | undefined;
    sensorId?: string | undefined;
    missionId?: string | undefined;
    processed?: boolean | undefined;
    priority?: number | undefined;
    legalAuthority?: string | undefined;
    minimized?: boolean | undefined;
    isSimulated?: boolean | undefined;
  }
>;
export type SignalMetadata = z.infer<typeof SignalMetadata>;
export declare const RawSignal: z.ZodObject<
  {
    metadata: z.ZodObject<
      {
        id: z.ZodString;
        timestamp: z.ZodDate;
        signalType: z.ZodEnum<
          [
            "RF_ANALOG",
            "RF_DIGITAL",
            "CELLULAR_2G",
            "CELLULAR_3G",
            "CELLULAR_4G",
            "CELLULAR_5G",
            "WIFI",
            "BLUETOOTH",
            "SATELLITE",
            "RADAR",
            "TELEMETRY",
            "NAVIGATION",
            "BROADCAST",
            "SHORTWAVE",
            "VHF",
            "UHF",
            "MICROWAVE",
            "UNKNOWN",
          ]
        >;
        category: z.ZodEnum<["COMINT", "ELINT", "FISINT", "MASINT", "TECHINT", "CYBER"]>;
        classification: z.ZodEnum<
          [
            "UNCLASSIFIED",
            "UNCLASSIFIED_FOUO",
            "CONFIDENTIAL",
            "SECRET",
            "TOP_SECRET",
            "TOP_SECRET_SCI",
          ]
        >;
        frequency: z.ZodOptional<z.ZodNumber>;
        bandwidth: z.ZodOptional<z.ZodNumber>;
        signalStrength: z.ZodOptional<z.ZodNumber>;
        snr: z.ZodOptional<z.ZodNumber>;
        modulation: z.ZodOptional<
          z.ZodEnum<
            [
              "AM",
              "FM",
              "PM",
              "SSB",
              "DSB",
              "ASK",
              "FSK",
              "PSK",
              "QAM",
              "OFDM",
              "BPSK",
              "QPSK",
              "8PSK",
              "16QAM",
              "64QAM",
              "GMSK",
              "MSK",
              "GFSK",
              "SPREAD_SPECTRUM",
              "FHSS",
              "DSSS",
              "CHIRP",
              "PULSE",
              "UNKNOWN",
            ]
          >
        >;
        location: z.ZodOptional<
          z.ZodObject<
            {
              latitude: z.ZodNumber;
              longitude: z.ZodNumber;
              altitude: z.ZodOptional<z.ZodNumber>;
              accuracy: z.ZodOptional<z.ZodNumber>;
              method: z.ZodEnum<["TDOA", "AOA", "RSSI", "GPS", "CELL", "HYBRID", "SIMULATED"]>;
            },
            "strip",
            z.ZodTypeAny,
            {
              latitude: number;
              longitude: number;
              method: "TDOA" | "AOA" | "RSSI" | "GPS" | "CELL" | "HYBRID" | "SIMULATED";
              altitude?: number | undefined;
              accuracy?: number | undefined;
            },
            {
              latitude: number;
              longitude: number;
              method: "TDOA" | "AOA" | "RSSI" | "GPS" | "CELL" | "HYBRID" | "SIMULATED";
              altitude?: number | undefined;
              accuracy?: number | undefined;
            }
          >
        >;
        collectorId: z.ZodString;
        sensorId: z.ZodOptional<z.ZodString>;
        missionId: z.ZodOptional<z.ZodString>;
        processed: z.ZodDefault<z.ZodBoolean>;
        priority: z.ZodDefault<z.ZodNumber>;
        legalAuthority: z.ZodOptional<z.ZodString>;
        minimized: z.ZodDefault<z.ZodBoolean>;
        isSimulated: z.ZodDefault<z.ZodBoolean>;
      },
      "strip",
      z.ZodTypeAny,
      {
        id: string;
        timestamp: Date;
        signalType:
          | "RF_ANALOG"
          | "RF_DIGITAL"
          | "CELLULAR_2G"
          | "CELLULAR_3G"
          | "CELLULAR_4G"
          | "CELLULAR_5G"
          | "WIFI"
          | "BLUETOOTH"
          | "SATELLITE"
          | "RADAR"
          | "TELEMETRY"
          | "NAVIGATION"
          | "BROADCAST"
          | "SHORTWAVE"
          | "VHF"
          | "UHF"
          | "MICROWAVE"
          | "UNKNOWN";
        category: "COMINT" | "ELINT" | "FISINT" | "MASINT" | "TECHINT" | "CYBER";
        classification:
          | "UNCLASSIFIED"
          | "UNCLASSIFIED_FOUO"
          | "CONFIDENTIAL"
          | "SECRET"
          | "TOP_SECRET"
          | "TOP_SECRET_SCI";
        collectorId: string;
        processed: boolean;
        priority: number;
        minimized: boolean;
        isSimulated: boolean;
        frequency?: number | undefined;
        bandwidth?: number | undefined;
        signalStrength?: number | undefined;
        snr?: number | undefined;
        modulation?:
          | "UNKNOWN"
          | "AM"
          | "FM"
          | "PM"
          | "SSB"
          | "DSB"
          | "ASK"
          | "FSK"
          | "PSK"
          | "QAM"
          | "OFDM"
          | "BPSK"
          | "QPSK"
          | "8PSK"
          | "16QAM"
          | "64QAM"
          | "GMSK"
          | "MSK"
          | "GFSK"
          | "SPREAD_SPECTRUM"
          | "FHSS"
          | "DSSS"
          | "CHIRP"
          | "PULSE"
          | undefined;
        location?:
          | {
              latitude: number;
              longitude: number;
              method: "TDOA" | "AOA" | "RSSI" | "GPS" | "CELL" | "HYBRID" | "SIMULATED";
              altitude?: number | undefined;
              accuracy?: number | undefined;
            }
          | undefined;
        sensorId?: string | undefined;
        missionId?: string | undefined;
        legalAuthority?: string | undefined;
      },
      {
        id: string;
        timestamp: Date;
        signalType:
          | "RF_ANALOG"
          | "RF_DIGITAL"
          | "CELLULAR_2G"
          | "CELLULAR_3G"
          | "CELLULAR_4G"
          | "CELLULAR_5G"
          | "WIFI"
          | "BLUETOOTH"
          | "SATELLITE"
          | "RADAR"
          | "TELEMETRY"
          | "NAVIGATION"
          | "BROADCAST"
          | "SHORTWAVE"
          | "VHF"
          | "UHF"
          | "MICROWAVE"
          | "UNKNOWN";
        category: "COMINT" | "ELINT" | "FISINT" | "MASINT" | "TECHINT" | "CYBER";
        classification:
          | "UNCLASSIFIED"
          | "UNCLASSIFIED_FOUO"
          | "CONFIDENTIAL"
          | "SECRET"
          | "TOP_SECRET"
          | "TOP_SECRET_SCI";
        collectorId: string;
        frequency?: number | undefined;
        bandwidth?: number | undefined;
        signalStrength?: number | undefined;
        snr?: number | undefined;
        modulation?:
          | "UNKNOWN"
          | "AM"
          | "FM"
          | "PM"
          | "SSB"
          | "DSB"
          | "ASK"
          | "FSK"
          | "PSK"
          | "QAM"
          | "OFDM"
          | "BPSK"
          | "QPSK"
          | "8PSK"
          | "16QAM"
          | "64QAM"
          | "GMSK"
          | "MSK"
          | "GFSK"
          | "SPREAD_SPECTRUM"
          | "FHSS"
          | "DSSS"
          | "CHIRP"
          | "PULSE"
          | undefined;
        location?:
          | {
              latitude: number;
              longitude: number;
              method: "TDOA" | "AOA" | "RSSI" | "GPS" | "CELL" | "HYBRID" | "SIMULATED";
              altitude?: number | undefined;
              accuracy?: number | undefined;
            }
          | undefined;
        sensorId?: string | undefined;
        missionId?: string | undefined;
        processed?: boolean | undefined;
        priority?: number | undefined;
        legalAuthority?: string | undefined;
        minimized?: boolean | undefined;
        isSimulated?: boolean | undefined;
      }
    >;
    samples: z.ZodOptional<
      z.ZodType<Float32Array<ArrayBuffer>, z.ZodTypeDef, Float32Array<ArrayBuffer>>
    >;
    iqData: z.ZodOptional<
      z.ZodObject<
        {
          i: z.ZodType<Float32Array<ArrayBuffer>, z.ZodTypeDef, Float32Array<ArrayBuffer>>;
          q: z.ZodType<Float32Array<ArrayBuffer>, z.ZodTypeDef, Float32Array<ArrayBuffer>>;
        },
        "strip",
        z.ZodTypeAny,
        {
          i: Float32Array<ArrayBuffer>;
          q: Float32Array<ArrayBuffer>;
        },
        {
          i: Float32Array<ArrayBuffer>;
          q: Float32Array<ArrayBuffer>;
        }
      >
    >;
    rawBytes: z.ZodOptional<
      z.ZodType<Uint8Array<ArrayBuffer>, z.ZodTypeDef, Uint8Array<ArrayBuffer>>
    >;
    decodedContent: z.ZodOptional<z.ZodString>;
  },
  "strip",
  z.ZodTypeAny,
  {
    metadata: {
      id: string;
      timestamp: Date;
      signalType:
        | "RF_ANALOG"
        | "RF_DIGITAL"
        | "CELLULAR_2G"
        | "CELLULAR_3G"
        | "CELLULAR_4G"
        | "CELLULAR_5G"
        | "WIFI"
        | "BLUETOOTH"
        | "SATELLITE"
        | "RADAR"
        | "TELEMETRY"
        | "NAVIGATION"
        | "BROADCAST"
        | "SHORTWAVE"
        | "VHF"
        | "UHF"
        | "MICROWAVE"
        | "UNKNOWN";
      category: "COMINT" | "ELINT" | "FISINT" | "MASINT" | "TECHINT" | "CYBER";
      classification:
        | "UNCLASSIFIED"
        | "UNCLASSIFIED_FOUO"
        | "CONFIDENTIAL"
        | "SECRET"
        | "TOP_SECRET"
        | "TOP_SECRET_SCI";
      collectorId: string;
      processed: boolean;
      priority: number;
      minimized: boolean;
      isSimulated: boolean;
      frequency?: number | undefined;
      bandwidth?: number | undefined;
      signalStrength?: number | undefined;
      snr?: number | undefined;
      modulation?:
        | "UNKNOWN"
        | "AM"
        | "FM"
        | "PM"
        | "SSB"
        | "DSB"
        | "ASK"
        | "FSK"
        | "PSK"
        | "QAM"
        | "OFDM"
        | "BPSK"
        | "QPSK"
        | "8PSK"
        | "16QAM"
        | "64QAM"
        | "GMSK"
        | "MSK"
        | "GFSK"
        | "SPREAD_SPECTRUM"
        | "FHSS"
        | "DSSS"
        | "CHIRP"
        | "PULSE"
        | undefined;
      location?:
        | {
            latitude: number;
            longitude: number;
            method: "TDOA" | "AOA" | "RSSI" | "GPS" | "CELL" | "HYBRID" | "SIMULATED";
            altitude?: number | undefined;
            accuracy?: number | undefined;
          }
        | undefined;
      sensorId?: string | undefined;
      missionId?: string | undefined;
      legalAuthority?: string | undefined;
    };
    samples?: Float32Array<ArrayBuffer> | undefined;
    iqData?:
      | {
          i: Float32Array<ArrayBuffer>;
          q: Float32Array<ArrayBuffer>;
        }
      | undefined;
    rawBytes?: Uint8Array<ArrayBuffer> | undefined;
    decodedContent?: string | undefined;
  },
  {
    metadata: {
      id: string;
      timestamp: Date;
      signalType:
        | "RF_ANALOG"
        | "RF_DIGITAL"
        | "CELLULAR_2G"
        | "CELLULAR_3G"
        | "CELLULAR_4G"
        | "CELLULAR_5G"
        | "WIFI"
        | "BLUETOOTH"
        | "SATELLITE"
        | "RADAR"
        | "TELEMETRY"
        | "NAVIGATION"
        | "BROADCAST"
        | "SHORTWAVE"
        | "VHF"
        | "UHF"
        | "MICROWAVE"
        | "UNKNOWN";
      category: "COMINT" | "ELINT" | "FISINT" | "MASINT" | "TECHINT" | "CYBER";
      classification:
        | "UNCLASSIFIED"
        | "UNCLASSIFIED_FOUO"
        | "CONFIDENTIAL"
        | "SECRET"
        | "TOP_SECRET"
        | "TOP_SECRET_SCI";
      collectorId: string;
      frequency?: number | undefined;
      bandwidth?: number | undefined;
      signalStrength?: number | undefined;
      snr?: number | undefined;
      modulation?:
        | "UNKNOWN"
        | "AM"
        | "FM"
        | "PM"
        | "SSB"
        | "DSB"
        | "ASK"
        | "FSK"
        | "PSK"
        | "QAM"
        | "OFDM"
        | "BPSK"
        | "QPSK"
        | "8PSK"
        | "16QAM"
        | "64QAM"
        | "GMSK"
        | "MSK"
        | "GFSK"
        | "SPREAD_SPECTRUM"
        | "FHSS"
        | "DSSS"
        | "CHIRP"
        | "PULSE"
        | undefined;
      location?:
        | {
            latitude: number;
            longitude: number;
            method: "TDOA" | "AOA" | "RSSI" | "GPS" | "CELL" | "HYBRID" | "SIMULATED";
            altitude?: number | undefined;
            accuracy?: number | undefined;
          }
        | undefined;
      sensorId?: string | undefined;
      missionId?: string | undefined;
      processed?: boolean | undefined;
      priority?: number | undefined;
      legalAuthority?: string | undefined;
      minimized?: boolean | undefined;
      isSimulated?: boolean | undefined;
    };
    samples?: Float32Array<ArrayBuffer> | undefined;
    iqData?:
      | {
          i: Float32Array<ArrayBuffer>;
          q: Float32Array<ArrayBuffer>;
        }
      | undefined;
    rawBytes?: Uint8Array<ArrayBuffer> | undefined;
    decodedContent?: string | undefined;
  }
>;
export type RawSignal = z.infer<typeof RawSignal>;
export declare const CollectionTask: z.ZodObject<
  {
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    targetFrequencies: z.ZodArray<
      z.ZodObject<
        {
          center: z.ZodNumber;
          bandwidth: z.ZodNumber;
          priority: z.ZodNumber;
        },
        "strip",
        z.ZodTypeAny,
        {
          bandwidth: number;
          priority: number;
          center: number;
        },
        {
          bandwidth: number;
          priority: number;
          center: number;
        }
      >,
      "many"
    >;
    targetSignalTypes: z.ZodOptional<
      z.ZodArray<
        z.ZodEnum<
          [
            "RF_ANALOG",
            "RF_DIGITAL",
            "CELLULAR_2G",
            "CELLULAR_3G",
            "CELLULAR_4G",
            "CELLULAR_5G",
            "WIFI",
            "BLUETOOTH",
            "SATELLITE",
            "RADAR",
            "TELEMETRY",
            "NAVIGATION",
            "BROADCAST",
            "SHORTWAVE",
            "VHF",
            "UHF",
            "MICROWAVE",
            "UNKNOWN",
          ]
        >,
        "many"
      >
    >;
    targetLocations: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            latitude: z.ZodNumber;
            longitude: z.ZodNumber;
            radius: z.ZodNumber;
          },
          "strip",
          z.ZodTypeAny,
          {
            latitude: number;
            longitude: number;
            radius: number;
          },
          {
            latitude: number;
            longitude: number;
            radius: number;
          }
        >,
        "many"
      >
    >;
    startTime: z.ZodDate;
    endTime: z.ZodOptional<z.ZodDate>;
    continuous: z.ZodDefault<z.ZodBoolean>;
    legalAuthority: z.ZodString;
    expirationDate: z.ZodDate;
    minimizationRequired: z.ZodDefault<z.ZodBoolean>;
    status: z.ZodEnum<["PENDING", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]>;
    isTrainingTask: z.ZodDefault<z.ZodBoolean>;
  },
  "strip",
  z.ZodTypeAny,
  {
    status: "PENDING" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
    id: string;
    legalAuthority: string;
    name: string;
    targetFrequencies: {
      bandwidth: number;
      priority: number;
      center: number;
    }[];
    startTime: Date;
    continuous: boolean;
    expirationDate: Date;
    minimizationRequired: boolean;
    isTrainingTask: boolean;
    description?: string | undefined;
    targetSignalTypes?:
      | (
          | "RF_ANALOG"
          | "RF_DIGITAL"
          | "CELLULAR_2G"
          | "CELLULAR_3G"
          | "CELLULAR_4G"
          | "CELLULAR_5G"
          | "WIFI"
          | "BLUETOOTH"
          | "SATELLITE"
          | "RADAR"
          | "TELEMETRY"
          | "NAVIGATION"
          | "BROADCAST"
          | "SHORTWAVE"
          | "VHF"
          | "UHF"
          | "MICROWAVE"
          | "UNKNOWN"
        )[]
      | undefined;
    targetLocations?:
      | {
          latitude: number;
          longitude: number;
          radius: number;
        }[]
      | undefined;
    endTime?: Date | undefined;
  },
  {
    status: "PENDING" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
    id: string;
    legalAuthority: string;
    name: string;
    targetFrequencies: {
      bandwidth: number;
      priority: number;
      center: number;
    }[];
    startTime: Date;
    expirationDate: Date;
    description?: string | undefined;
    targetSignalTypes?:
      | (
          | "RF_ANALOG"
          | "RF_DIGITAL"
          | "CELLULAR_2G"
          | "CELLULAR_3G"
          | "CELLULAR_4G"
          | "CELLULAR_5G"
          | "WIFI"
          | "BLUETOOTH"
          | "SATELLITE"
          | "RADAR"
          | "TELEMETRY"
          | "NAVIGATION"
          | "BROADCAST"
          | "SHORTWAVE"
          | "VHF"
          | "UHF"
          | "MICROWAVE"
          | "UNKNOWN"
        )[]
      | undefined;
    targetLocations?:
      | {
          latitude: number;
          longitude: number;
          radius: number;
        }[]
      | undefined;
    endTime?: Date | undefined;
    continuous?: boolean | undefined;
    minimizationRequired?: boolean | undefined;
    isTrainingTask?: boolean | undefined;
  }
>;
export type CollectionTask = z.infer<typeof CollectionTask>;
export declare const SpectrumData: z.ZodObject<
  {
    id: z.ZodString;
    timestamp: z.ZodDate;
    startFrequency: z.ZodNumber;
    endFrequency: z.ZodNumber;
    resolution: z.ZodNumber;
    powerLevels: z.ZodArray<z.ZodNumber, "many">;
    peakFrequencies: z.ZodArray<
      z.ZodObject<
        {
          frequency: z.ZodNumber;
          power: z.ZodNumber;
        },
        "strip",
        z.ZodTypeAny,
        {
          frequency: number;
          power: number;
        },
        {
          frequency: number;
          power: number;
        }
      >,
      "many"
    >;
    isSimulated: z.ZodDefault<z.ZodBoolean>;
  },
  "strip",
  z.ZodTypeAny,
  {
    id: string;
    timestamp: Date;
    isSimulated: boolean;
    startFrequency: number;
    endFrequency: number;
    resolution: number;
    powerLevels: number[];
    peakFrequencies: {
      frequency: number;
      power: number;
    }[];
  },
  {
    id: string;
    timestamp: Date;
    startFrequency: number;
    endFrequency: number;
    resolution: number;
    powerLevels: number[];
    peakFrequencies: {
      frequency: number;
      power: number;
    }[];
    isSimulated?: boolean | undefined;
  }
>;
export type SpectrumData = z.infer<typeof SpectrumData>;
export declare const EmitterProfile: z.ZodObject<
  {
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    frequency: z.ZodNumber;
    bandwidth: z.ZodNumber;
    modulation: z.ZodEnum<
      [
        "AM",
        "FM",
        "PM",
        "SSB",
        "DSB",
        "ASK",
        "FSK",
        "PSK",
        "QAM",
        "OFDM",
        "BPSK",
        "QPSK",
        "8PSK",
        "16QAM",
        "64QAM",
        "GMSK",
        "MSK",
        "GFSK",
        "SPREAD_SPECTRUM",
        "FHSS",
        "DSSS",
        "CHIRP",
        "PULSE",
        "UNKNOWN",
      ]
    >;
    power: z.ZodNumber;
    fingerprint: z.ZodObject<
      {
        spectralSignature: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        timingPatterns: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        uniqueIdentifiers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
      },
      "strip",
      z.ZodTypeAny,
      {
        spectralSignature?: number[] | undefined;
        timingPatterns?: number[] | undefined;
        uniqueIdentifiers?: string[] | undefined;
      },
      {
        spectralSignature?: number[] | undefined;
        timingPatterns?: number[] | undefined;
        uniqueIdentifiers?: string[] | undefined;
      }
    >;
    emitterType: z.ZodString;
    platform: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    threatLevel: z.ZodEnum<["UNKNOWN", "LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
    firstSeen: z.ZodDate;
    lastSeen: z.ZodDate;
    observationCount: z.ZodNumber;
    isSimulated: z.ZodDefault<z.ZodBoolean>;
  },
  "strip",
  z.ZodTypeAny,
  {
    id: string;
    frequency: number;
    bandwidth: number;
    modulation:
      | "UNKNOWN"
      | "AM"
      | "FM"
      | "PM"
      | "SSB"
      | "DSB"
      | "ASK"
      | "FSK"
      | "PSK"
      | "QAM"
      | "OFDM"
      | "BPSK"
      | "QPSK"
      | "8PSK"
      | "16QAM"
      | "64QAM"
      | "GMSK"
      | "MSK"
      | "GFSK"
      | "SPREAD_SPECTRUM"
      | "FHSS"
      | "DSSS"
      | "CHIRP"
      | "PULSE";
    isSimulated: boolean;
    power: number;
    fingerprint: {
      spectralSignature?: number[] | undefined;
      timingPatterns?: number[] | undefined;
      uniqueIdentifiers?: string[] | undefined;
    };
    emitterType: string;
    threatLevel: "UNKNOWN" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    firstSeen: Date;
    lastSeen: Date;
    observationCount: number;
    name?: string | undefined;
    platform?: string | undefined;
    country?: string | undefined;
  },
  {
    id: string;
    frequency: number;
    bandwidth: number;
    modulation:
      | "UNKNOWN"
      | "AM"
      | "FM"
      | "PM"
      | "SSB"
      | "DSB"
      | "ASK"
      | "FSK"
      | "PSK"
      | "QAM"
      | "OFDM"
      | "BPSK"
      | "QPSK"
      | "8PSK"
      | "16QAM"
      | "64QAM"
      | "GMSK"
      | "MSK"
      | "GFSK"
      | "SPREAD_SPECTRUM"
      | "FHSS"
      | "DSSS"
      | "CHIRP"
      | "PULSE";
    power: number;
    fingerprint: {
      spectralSignature?: number[] | undefined;
      timingPatterns?: number[] | undefined;
      uniqueIdentifiers?: string[] | undefined;
    };
    emitterType: string;
    threatLevel: "UNKNOWN" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    firstSeen: Date;
    lastSeen: Date;
    observationCount: number;
    isSimulated?: boolean | undefined;
    name?: string | undefined;
    platform?: string | undefined;
    country?: string | undefined;
  }
>;
export type EmitterProfile = z.infer<typeof EmitterProfile>;
export declare const COMINTMessage: z.ZodObject<
  {
    id: z.ZodString;
    timestamp: z.ZodDate;
    sourceSignal: z.ZodString;
    communicationType: z.ZodEnum<
      ["VOICE", "SMS", "EMAIL", "VOIP", "RADIO", "SATELLITE", "DATA", "FAX", "TELETYPE", "UNKNOWN"]
    >;
    participants: z.ZodArray<
      z.ZodObject<
        {
          identifier: z.ZodString;
          role: z.ZodEnum<["SENDER", "RECEIVER", "CC", "PARTICIPANT"]>;
          location: z.ZodOptional<
            z.ZodObject<
              {
                latitude: z.ZodNumber;
                longitude: z.ZodNumber;
              },
              "strip",
              z.ZodTypeAny,
              {
                latitude: number;
                longitude: number;
              },
              {
                latitude: number;
                longitude: number;
              }
            >
          >;
        },
        "strip",
        z.ZodTypeAny,
        {
          identifier: string;
          role: "SENDER" | "RECEIVER" | "CC" | "PARTICIPANT";
          location?:
            | {
                latitude: number;
                longitude: number;
              }
            | undefined;
        },
        {
          identifier: string;
          role: "SENDER" | "RECEIVER" | "CC" | "PARTICIPANT";
          location?:
            | {
                latitude: number;
                longitude: number;
              }
            | undefined;
        }
      >,
      "many"
    >;
    content: z.ZodObject<
      {
        raw: z.ZodOptional<z.ZodString>;
        transcription: z.ZodOptional<z.ZodString>;
        translation: z.ZodOptional<z.ZodString>;
        language: z.ZodOptional<z.ZodString>;
        summary: z.ZodOptional<z.ZodString>;
      },
      "strip",
      z.ZodTypeAny,
      {
        raw?: string | undefined;
        transcription?: string | undefined;
        translation?: string | undefined;
        language?: string | undefined;
        summary?: string | undefined;
      },
      {
        raw?: string | undefined;
        transcription?: string | undefined;
        translation?: string | undefined;
        language?: string | undefined;
        summary?: string | undefined;
      }
    >;
    keywords: z.ZodArray<z.ZodString, "many">;
    entities: z.ZodArray<
      z.ZodObject<
        {
          text: z.ZodString;
          type: z.ZodEnum<
            ["PERSON", "ORGANIZATION", "LOCATION", "DATE", "PHONE", "EMAIL", "OTHER"]
          >;
          confidence: z.ZodNumber;
        },
        "strip",
        z.ZodTypeAny,
        {
          type: "EMAIL" | "PERSON" | "ORGANIZATION" | "LOCATION" | "DATE" | "PHONE" | "OTHER";
          text: string;
          confidence: number;
        },
        {
          type: "EMAIL" | "PERSON" | "ORGANIZATION" | "LOCATION" | "DATE" | "PHONE" | "OTHER";
          text: string;
          confidence: number;
        }
      >,
      "many"
    >;
    classification: z.ZodEnum<
      [
        "UNCLASSIFIED",
        "UNCLASSIFIED_FOUO",
        "CONFIDENTIAL",
        "SECRET",
        "TOP_SECRET",
        "TOP_SECRET_SCI",
      ]
    >;
    minimized: z.ZodDefault<z.ZodBoolean>;
    isSimulated: z.ZodDefault<z.ZodBoolean>;
  },
  "strip",
  z.ZodTypeAny,
  {
    id: string;
    timestamp: Date;
    classification:
      | "UNCLASSIFIED"
      | "UNCLASSIFIED_FOUO"
      | "CONFIDENTIAL"
      | "SECRET"
      | "TOP_SECRET"
      | "TOP_SECRET_SCI";
    minimized: boolean;
    isSimulated: boolean;
    sourceSignal: string;
    communicationType:
      | "SATELLITE"
      | "UNKNOWN"
      | "VOICE"
      | "SMS"
      | "EMAIL"
      | "VOIP"
      | "RADIO"
      | "DATA"
      | "FAX"
      | "TELETYPE";
    participants: {
      identifier: string;
      role: "SENDER" | "RECEIVER" | "CC" | "PARTICIPANT";
      location?:
        | {
            latitude: number;
            longitude: number;
          }
        | undefined;
    }[];
    content: {
      raw?: string | undefined;
      transcription?: string | undefined;
      translation?: string | undefined;
      language?: string | undefined;
      summary?: string | undefined;
    };
    keywords: string[];
    entities: {
      type: "EMAIL" | "PERSON" | "ORGANIZATION" | "LOCATION" | "DATE" | "PHONE" | "OTHER";
      text: string;
      confidence: number;
    }[];
  },
  {
    id: string;
    timestamp: Date;
    classification:
      | "UNCLASSIFIED"
      | "UNCLASSIFIED_FOUO"
      | "CONFIDENTIAL"
      | "SECRET"
      | "TOP_SECRET"
      | "TOP_SECRET_SCI";
    sourceSignal: string;
    communicationType:
      | "SATELLITE"
      | "UNKNOWN"
      | "VOICE"
      | "SMS"
      | "EMAIL"
      | "VOIP"
      | "RADIO"
      | "DATA"
      | "FAX"
      | "TELETYPE";
    participants: {
      identifier: string;
      role: "SENDER" | "RECEIVER" | "CC" | "PARTICIPANT";
      location?:
        | {
            latitude: number;
            longitude: number;
          }
        | undefined;
    }[];
    content: {
      raw?: string | undefined;
      transcription?: string | undefined;
      translation?: string | undefined;
      language?: string | undefined;
      summary?: string | undefined;
    };
    keywords: string[];
    entities: {
      type: "EMAIL" | "PERSON" | "ORGANIZATION" | "LOCATION" | "DATE" | "PHONE" | "OTHER";
      text: string;
      confidence: number;
    }[];
    minimized?: boolean | undefined;
    isSimulated?: boolean | undefined;
  }
>;
export type COMINTMessage = z.infer<typeof COMINTMessage>;
export declare const ELINTReport: z.ZodObject<
  {
    id: z.ZodString;
    timestamp: z.ZodDate;
    emitterId: z.ZodString;
    emitterType: z.ZodEnum<
      [
        "RADAR_SEARCH",
        "RADAR_TRACK",
        "RADAR_FIRE_CONTROL",
        "RADAR_HEIGHT_FINDER",
        "RADAR_WEATHER",
        "RADAR_NAVIGATION",
        "IFF",
        "TACAN",
        "DATALINK",
        "JAMMER",
        "BEACON",
        "TELEMETRY",
        "UNKNOWN",
      ]
    >;
    parameters: z.ZodObject<
      {
        frequency: z.ZodNumber;
        pri: z.ZodOptional<z.ZodNumber>;
        prf: z.ZodOptional<z.ZodNumber>;
        pulseWidth: z.ZodOptional<z.ZodNumber>;
        scanRate: z.ZodOptional<z.ZodNumber>;
        scanType: z.ZodOptional<z.ZodString>;
        power: z.ZodOptional<z.ZodNumber>;
        antennaPattern: z.ZodOptional<z.ZodString>;
      },
      "strip",
      z.ZodTypeAny,
      {
        frequency: number;
        power?: number | undefined;
        pri?: number | undefined;
        prf?: number | undefined;
        pulseWidth?: number | undefined;
        scanRate?: number | undefined;
        scanType?: string | undefined;
        antennaPattern?: string | undefined;
      },
      {
        frequency: number;
        power?: number | undefined;
        pri?: number | undefined;
        prf?: number | undefined;
        pulseWidth?: number | undefined;
        scanRate?: number | undefined;
        scanType?: string | undefined;
        antennaPattern?: string | undefined;
      }
    >;
    platform: z.ZodObject<
      {
        type: z.ZodEnum<["GROUND", "AIRBORNE", "NAVAL", "SPACE", "UNKNOWN"]>;
        designation: z.ZodOptional<z.ZodString>;
        nationality: z.ZodOptional<z.ZodString>;
      },
      "strip",
      z.ZodTypeAny,
      {
        type: "UNKNOWN" | "GROUND" | "AIRBORNE" | "NAVAL" | "SPACE";
        designation?: string | undefined;
        nationality?: string | undefined;
      },
      {
        type: "UNKNOWN" | "GROUND" | "AIRBORNE" | "NAVAL" | "SPACE";
        designation?: string | undefined;
        nationality?: string | undefined;
      }
    >;
    location: z.ZodOptional<
      z.ZodObject<
        {
          latitude: z.ZodNumber;
          longitude: z.ZodNumber;
          accuracy: z.ZodNumber;
        },
        "strip",
        z.ZodTypeAny,
        {
          latitude: number;
          longitude: number;
          accuracy: number;
        },
        {
          latitude: number;
          longitude: number;
          accuracy: number;
        }
      >
    >;
    threat: z.ZodObject<
      {
        level: z.ZodEnum<["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
        assessment: z.ZodString;
      },
      "strip",
      z.ZodTypeAny,
      {
        level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "NONE";
        assessment: string;
      },
      {
        level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "NONE";
        assessment: string;
      }
    >;
    classification: z.ZodEnum<
      [
        "UNCLASSIFIED",
        "UNCLASSIFIED_FOUO",
        "CONFIDENTIAL",
        "SECRET",
        "TOP_SECRET",
        "TOP_SECRET_SCI",
      ]
    >;
    isSimulated: z.ZodDefault<z.ZodBoolean>;
  },
  "strip",
  z.ZodTypeAny,
  {
    id: string;
    timestamp: Date;
    classification:
      | "UNCLASSIFIED"
      | "UNCLASSIFIED_FOUO"
      | "CONFIDENTIAL"
      | "SECRET"
      | "TOP_SECRET"
      | "TOP_SECRET_SCI";
    isSimulated: boolean;
    emitterType:
      | "TELEMETRY"
      | "UNKNOWN"
      | "RADAR_SEARCH"
      | "RADAR_TRACK"
      | "RADAR_FIRE_CONTROL"
      | "RADAR_HEIGHT_FINDER"
      | "RADAR_WEATHER"
      | "RADAR_NAVIGATION"
      | "IFF"
      | "TACAN"
      | "DATALINK"
      | "JAMMER"
      | "BEACON";
    platform: {
      type: "UNKNOWN" | "GROUND" | "AIRBORNE" | "NAVAL" | "SPACE";
      designation?: string | undefined;
      nationality?: string | undefined;
    };
    emitterId: string;
    parameters: {
      frequency: number;
      power?: number | undefined;
      pri?: number | undefined;
      prf?: number | undefined;
      pulseWidth?: number | undefined;
      scanRate?: number | undefined;
      scanType?: string | undefined;
      antennaPattern?: string | undefined;
    };
    threat: {
      level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "NONE";
      assessment: string;
    };
    location?:
      | {
          latitude: number;
          longitude: number;
          accuracy: number;
        }
      | undefined;
  },
  {
    id: string;
    timestamp: Date;
    classification:
      | "UNCLASSIFIED"
      | "UNCLASSIFIED_FOUO"
      | "CONFIDENTIAL"
      | "SECRET"
      | "TOP_SECRET"
      | "TOP_SECRET_SCI";
    emitterType:
      | "TELEMETRY"
      | "UNKNOWN"
      | "RADAR_SEARCH"
      | "RADAR_TRACK"
      | "RADAR_FIRE_CONTROL"
      | "RADAR_HEIGHT_FINDER"
      | "RADAR_WEATHER"
      | "RADAR_NAVIGATION"
      | "IFF"
      | "TACAN"
      | "DATALINK"
      | "JAMMER"
      | "BEACON";
    platform: {
      type: "UNKNOWN" | "GROUND" | "AIRBORNE" | "NAVAL" | "SPACE";
      designation?: string | undefined;
      nationality?: string | undefined;
    };
    emitterId: string;
    parameters: {
      frequency: number;
      power?: number | undefined;
      pri?: number | undefined;
      prf?: number | undefined;
      pulseWidth?: number | undefined;
      scanRate?: number | undefined;
      scanType?: string | undefined;
      antennaPattern?: string | undefined;
    };
    threat: {
      level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "NONE";
      assessment: string;
    };
    location?:
      | {
          latitude: number;
          longitude: number;
          accuracy: number;
        }
      | undefined;
    isSimulated?: boolean | undefined;
  }
>;
export type ELINTReport = z.infer<typeof ELINTReport>;
//# sourceMappingURL=types.d.ts.map
