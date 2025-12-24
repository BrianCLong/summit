import EWService, {
  EWAsset,
  JammingMission,
  SpectrumSignal,
  DirectionFindingResult
} from '../../services/ElectronicWarfareService';

const resolvers = {
  Query: {
    ewBattleSpace: () => {
      return EWService.getBattleSpacePicture();
    },
    ewAnalyzeEMP: (_: unknown, args: { lat: number; lon: number; yieldKt: number }) => {
      return EWService.analyzeEMPBlast({ lat: args.lat, lon: args.lon }, args.yieldKt);
    },
  },
  Mutation: {
    ewRegisterAsset: (_: unknown, args: {
        id: string;
        name: string;
        type: 'GROUND_STATION' | 'AIRCRAFT' | 'SATELLITE' | 'SHIP' | 'MANPACK';
        lat: number;
        lon: number;
        capabilities: any[];
        maxPower: number;
        minFreq: number;
        maxFreq: number;
    }) => {
      const asset: EWAsset = {
        id: args.id,
        name: args.name,
        type: args.type,
        location: { lat: args.lat, lon: args.lon },
        capabilities: args.capabilities,
        maxPower: args.maxPower,
        frequencyRange: [args.minFreq, args.maxFreq],
        status: 'ACTIVE',
        activeProtection: [],
      };
      EWService.registerAsset(asset);
      return asset;
    },
    ewDeployJammer: (
      _: unknown,
      args: {
        assetId: string;
        targetFrequency: number;
        bandwidth: number;
        effect: any;
        durationSeconds?: number;
      }
    ) => {
      return EWService.deployJammer(
        args.assetId,
        args.targetFrequency,
        args.bandwidth,
        args.effect,
        args.durationSeconds
      );
    },
    ewStopJammer: (_: unknown, args: { missionId: string }) => {
      try {
        EWService.stopJammer(args.missionId);
        return true;
      } catch (e) {
        return false;
      }
    },
    ewSimulateSignalDetection: (_: unknown, args: {
        frequency: number;
        bandwidth: number;
        power: number;
        modulation: string;
        type: any;
        lat?: number;
        lon?: number;
    }) => {
      const signal: SpectrumSignal = {
        id: `SIG-${Date.now()}`,
        frequency: args.frequency,
        bandwidth: args.bandwidth,
        power: args.power,
        modulation: args.modulation,
        type: args.type,
        location: args.lat ? { lat: args.lat, lon: args.lon } : undefined,
        timestamp: new Date(),
      };
      EWService.detectSignal(signal);
      return signal;
    },
    ewTriangulateSignal: (_: unknown, args: { signalId: string }) => {
      return EWService.triangulateSignal(args.signalId);
    },
    ewActivateProtection: (_: unknown, args: { assetId: string; measure: any }) => {
      try {
        EWService.activateProtection(args.assetId, args.measure);
        return true;
      } catch (e) {
        return false;
      }
    },
  },
};

export default resolvers;
