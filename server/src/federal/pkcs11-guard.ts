import * as pkcs11 from 'pkcs11js';
import crypto from 'node:crypto';
import { otelService } from '../middleware/observability/otel-tracing.js';

// PKCS#11 Guard for Federal/Gov Pack - CloudHSM with strict mechanism allowlist
export type AllowedMech = 'AES_GCM_256' | 'ECDSA_P384' | 'RSA_PSS_4096';

// FIPS mode flag from PKCS#11 token info
const CKF_FIPS_MODE = 0x00000002;

// Strict mechanism allowlist with parameter validation
const ALLOWLIST: Record<
  AllowedMech,
  {
    mech: number;
    guard?: (params: any) => void;
    description: string;
  }
> = {
  AES_GCM_256: {
    mech: 0x00001087, // CKM_AES_GCM
    description: 'AES-256-GCM with 96+ bit tag',
    guard: (p) => {
      if (!p || typeof p.iv !== 'object' || p.iv.length < 12) {
        throw new Error('AES-GCM requires IV >= 12 bytes');
      }
      if (!p.ulTagBits || p.ulTagBits < 96) {
        throw new Error('AES-GCM requires tag >= 96 bits');
      }
      if (p.iv.length > 16) {
        throw new Error('AES-GCM IV should be <= 16 bytes for security');
      }
    },
  },
  ECDSA_P384: {
    mech: 0x00001041, // CKM_ECDSA
    description: 'ECDSA with P-384 curve',
    guard: (p) => {
      if (p) throw new Error('ECDSA should not have mechanism parameters');
    },
  },
  RSA_PSS_4096: {
    mech: 0x0000000d, // CKM_RSA_PKCS_PSS
    description: 'RSA-PSS-4096 with SHA-384/MGF1-SHA384',
    guard: (p) => {
      if (!p) throw new Error('RSA-PSS requires parameters');
      if (p.hashAlg !== 0x00000060)
        throw new Error('RSA-PSS requires SHA-384 (0x60)'); // CKM_SHA384
      if (p.mgf !== 0x00000003)
        throw new Error('RSA-PSS requires MGF1-SHA384 (0x03)'); // CKG_MGF1_SHA384
      if (!p.sLen || p.sLen < 48)
        throw new Error('RSA-PSS salt length must be >= 48 bytes');
    },
  },
};

export interface PKCS11Context {
  p11: pkcs11.PKCS11;
  slot: pkcs11.Slot;
  session: pkcs11.Session;
  tokenInfo: any;
  mechanisms: number[];
}

export interface HSMSelfTest {
  timestamp: Date;
  vendor: string;
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  fipsMode: boolean;
  supportedMechanisms: string[];
  allowlistCompliance: boolean;
  testResults: {
    randomGeneration: boolean;
    keyGeneration: boolean;
    encryption: boolean;
    signing: boolean;
  };
}

/**
 * Initialize PKCS#11 connection with strict FIPS validation
 */
export function initPKCS11(
  libPath: string = '/opt/cloudhsm/lib/libcloudhsm_pkcs11.so',
  slotIndex: number = 0,
): PKCS11Context {
  const span = otelService.createSpan('pkcs11.init');

  try {
    const p11 = new pkcs11.PKCS11();
    p11.load(libPath);
    p11.C_Initialize();

    const slots = p11.C_GetSlotList(true);
    if (!slots.length) {
      throw new Error('No HSM slots available');
    }

    if (slotIndex >= slots.length) {
      throw new Error(
        `Slot index ${slotIndex} not available (${slots.length} slots found)`,
      );
    }

    const slot = slots[slotIndex];
    const slotInfo = p11.C_GetSlotInfo(slot);
    const tokenInfo = p11.C_GetTokenInfo(slot);

    // Strict FIPS mode enforcement
    if ((tokenInfo.flags & CKF_FIPS_MODE) === 0) {
      throw new Error(
        `HSM slot ${slotIndex} not in FIPS mode (flags: 0x${tokenInfo.flags.toString(16)})`,
      );
    }

    // Get supported mechanisms
    const mechanisms = p11.C_GetMechanismList(slot);

    const session = p11.C_OpenSession(
      slot,
      pkcs11.CKF_SERIAL_SESSION | pkcs11.CKF_RW_SESSION,
    );

    otelService.addSpanAttributes({
      'pkcs11.lib_path': libPath,
      'pkcs11.slot_index': slotIndex,
      'pkcs11.fips_mode': true,
      'pkcs11.token_label': tokenInfo.label?.trim(),
      'pkcs11.mechanism_count': mechanisms.length,
    });

    console.log(
      `✅ PKCS#11 initialized: ${tokenInfo.label?.trim()} (FIPS mode active)`,
    );

    return {
      p11,
      slot,
      session,
      tokenInfo,
      mechanisms,
    };
  } catch (error: any) {
    console.error('PKCS#11 initialization failed:', error);
    otelService.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    throw error;
  } finally {
    span?.end();
  }
}

/**
 * Assert HSM supports all allowlisted mechanisms
 */
export function assertMechanismsSupported(ctx: PKCS11Context): AllowedMech[] {
  const span = otelService.createSpan('pkcs11.assert_mechanisms');

  try {
    const supported = new Set(ctx.mechanisms);
    const missing: AllowedMech[] = [];
    const available: AllowedMech[] = [];

    (Object.keys(ALLOWLIST) as AllowedMech[]).forEach((name) => {
      const def = ALLOWLIST[name];
      if (!supported.has(def.mech)) {
        missing.push(name);
      } else {
        available.push(name);
      }
    });

    if (missing.length > 0) {
      throw new Error(`HSM missing required mechanisms: ${missing.join(', ')}`);
    }

    otelService.addSpanAttributes({
      'pkcs11.mechanisms_verified': available.length,
      'pkcs11.mechanisms_missing': missing.length,
    });

    console.log(`✅ HSM mechanism validation passed: ${available.join(', ')}`);
    return available;
  } catch (error: any) {
    console.error('HSM mechanism assertion failed:', error);
    otelService.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    throw error;
  } finally {
    span?.end();
  }
}

/**
 * Enforce mechanism allowlist with parameter validation
 */
export function enforceMech(
  name: AllowedMech,
  params?: any,
): { mechanism: number; parameter?: any } {
  const def = ALLOWLIST[name];
  if (!def) {
    throw new Error(`Mechanism '${name}' not in allowlist`);
  }

  // Run parameter guard if defined
  if (def.guard) {
    def.guard(params);
  }

  return { mechanism: def.mech, parameter: params };
}

/**
 * Perform comprehensive HSM self-test for ATO evidence
 */
export async function performHSMSelfTest(
  ctx: PKCS11Context,
): Promise<HSMSelfTest> {
  const span = otelService.createSpan('pkcs11.self_test');

  try {
    const testResults = {
      randomGeneration: false,
      keyGeneration: false,
      encryption: false,
      signing: false,
    };

    // Test 1: Random number generation
    try {
      const random = ctx.p11.C_GenerateRandom(ctx.session, 32);
      testResults.randomGeneration = random.length === 32;
    } catch (error) {
      console.warn('HSM random generation test failed:', error);
    }

    // Test 2: Key generation (temporary AES key)
    let hTempKey: pkcs11.Handle | null = null;
    try {
      const template = [
        { type: pkcs11.CKA_CLASS, value: pkcs11.CKO_SECRET_KEY },
        { type: pkcs11.CKA_KEY_TYPE, value: pkcs11.CKK_AES },
        { type: pkcs11.CKA_VALUE_LEN, value: 32 }, // 256 bits
        { type: pkcs11.CKA_ENCRYPT, value: true },
        { type: pkcs11.CKA_DECRYPT, value: true },
        { type: pkcs11.CKA_TOKEN, value: false }, // session key
      ];

      const mech = enforceMech('AES_GCM_256');
      hTempKey = ctx.p11.C_GenerateKey(ctx.session, mech, template);
      testResults.keyGeneration = true;

      // Test 3: Encryption with generated key
      const plaintext = Buffer.from('FIPS compliance test vector', 'utf8');
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const params = { iv: Buffer.from(iv), ulTagBits: 128 };
      const encMech = enforceMech('AES_GCM_256', params);

      ctx.p11.C_EncryptInit(ctx.session, encMech, hTempKey);
      const ciphertext1 = ctx.p11.C_EncryptUpdate(ctx.session, plaintext);
      const ciphertext2 = ctx.p11.C_EncryptFinal(ctx.session);

      testResults.encryption = ciphertext1.length > 0 || ciphertext2.length > 0;
    } catch (error) {
      console.warn('HSM key generation/encryption test failed:', error);
    } finally {
      // Clean up temporary key
      if (hTempKey) {
        try {
          ctx.p11.C_DestroyObject(ctx.session, hTempKey);
        } catch (error) {
          console.warn('Failed to cleanup temp key:', error);
        }
      }
    }

    // Test 4: Digital signature (if ECDSA key available)
    try {
      // Look for existing ECDSA key for testing
      ctx.p11.C_FindObjectsInit(ctx.session, [
        { type: pkcs11.CKA_CLASS, value: pkcs11.CKO_PRIVATE_KEY },
        { type: pkcs11.CKA_KEY_TYPE, value: pkcs11.CKK_EC },
      ]);
      const keys = ctx.p11.C_FindObjects(ctx.session, 1);
      ctx.p11.C_FindObjectsFinal(ctx.session);

      if (keys.length > 0) {
        const hPrivKey = keys[0];
        const testData = Buffer.from('HSM signing test', 'utf8');
        const sigMech = enforceMech('ECDSA_P384');

        ctx.p11.C_SignInit(ctx.session, sigMech, hPrivKey);
        const signature = ctx.p11.C_Sign(ctx.session, testData);
        testResults.signing = signature.length > 0;
      }
    } catch (error) {
      console.warn('HSM signing test failed:', error);
    }

    const selfTest: HSMSelfTest = {
      timestamp: new Date(),
      vendor: ctx.tokenInfo.manufacturerID?.trim() || 'unknown',
      model: ctx.tokenInfo.model?.trim() || 'unknown',
      serialNumber: ctx.tokenInfo.serialNumber?.trim() || 'unknown',
      firmwareVersion: `${ctx.tokenInfo.firmwareVersion?.major || 0}.${ctx.tokenInfo.firmwareVersion?.minor || 0}`,
      fipsMode: (ctx.tokenInfo.flags & CKF_FIPS_MODE) !== 0,
      supportedMechanisms: ctx.mechanisms.map(
        (m) => `0x${m.toString(16).padStart(8, '0')}`,
      ),
      allowlistCompliance: Object.keys(ALLOWLIST).every((name) =>
        ctx.mechanisms.includes(ALLOWLIST[name as AllowedMech].mech),
      ),
      testResults,
    };

    const allTestsPassed = Object.values(testResults).every((result) => result);

    otelService.addSpanAttributes({
      'hsm_test.vendor': selfTest.vendor,
      'hsm_test.model': selfTest.model,
      'hsm_test.fips_mode': selfTest.fipsMode,
      'hsm_test.allowlist_compliance': selfTest.allowlistCompliance,
      'hsm_test.all_passed': allTestsPassed,
    });

    console.log(`HSM Self-Test Results:`, {
      vendor: selfTest.vendor,
      model: selfTest.model,
      fipsMode: selfTest.fipsMode,
      allTestsPassed,
      testResults,
    });

    return selfTest;
  } catch (error: any) {
    console.error('HSM self-test failed:', error);
    otelService.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    throw error;
  } finally {
    span?.end();
  }
}

/**
 * AES-256-GCM encryption using HSM
 */
export function aes256gcmEncrypt(
  ctx: PKCS11Context,
  keyLabel: string,
  plaintext: Buffer,
  aad?: Buffer,
): { ciphertext: Buffer; iv: Buffer; tag: Buffer } {
  const span = otelService.createSpan('pkcs11.aes256gcm_encrypt');

  try {
    // Find AES key by label
    ctx.p11.C_FindObjectsInit(ctx.session, [
      { type: pkcs11.CKA_LABEL, value: Buffer.from(keyLabel) },
      { type: pkcs11.CKA_CLASS, value: pkcs11.CKO_SECRET_KEY },
      { type: pkcs11.CKA_KEY_TYPE, value: pkcs11.CKK_AES },
    ]);
    const keys = ctx.p11.C_FindObjects(ctx.session, 1);
    ctx.p11.C_FindObjectsFinal(ctx.session);

    if (keys.length === 0) {
      throw new Error(`AES key with label '${keyLabel}' not found`);
    }

    const hKey = keys[0];
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
    const params = {
      iv: Buffer.from(iv),
      aad: aad || Buffer.alloc(0),
      ulTagBits: 128,
    };

    const mech = enforceMech('AES_GCM_256', params);

    ctx.p11.C_EncryptInit(ctx.session, mech, hKey);
    const encrypted1 = ctx.p11.C_EncryptUpdate(ctx.session, plaintext);
    const encrypted2 = ctx.p11.C_EncryptFinal(ctx.session);

    // For AES-GCM, the tag is typically appended to the final output
    const ciphertext = Buffer.concat([encrypted1, encrypted2.slice(0, -16)]);
    const tag = encrypted2.slice(-16);

    otelService.addSpanAttributes({
      'aes_gcm.key_label': keyLabel,
      'aes_gcm.plaintext_length': plaintext.length,
      'aes_gcm.ciphertext_length': ciphertext.length,
      'aes_gcm.aad_length': aad?.length || 0,
    });

    return { ciphertext, iv: Buffer.from(iv), tag };
  } catch (error: any) {
    console.error('AES-256-GCM encryption failed:', error);
    otelService.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    throw error;
  } finally {
    span?.end();
  }
}

/**
 * ECDSA-P384 signing using HSM
 */
export function ecdsaP384Sign(
  ctx: PKCS11Context,
  keyLabel: string,
  data: Buffer,
): Buffer {
  const span = otelService.createSpan('pkcs11.ecdsa_p384_sign');

  try {
    // Find ECDSA private key by label
    ctx.p11.C_FindObjectsInit(ctx.session, [
      { type: pkcs11.CKA_LABEL, value: Buffer.from(keyLabel) },
      { type: pkcs11.CKA_CLASS, value: pkcs11.CKO_PRIVATE_KEY },
      { type: pkcs11.CKA_KEY_TYPE, value: pkcs11.CKK_EC },
    ]);
    const keys = ctx.p11.C_FindObjects(ctx.session, 1);
    ctx.p11.C_FindObjectsFinal(ctx.session);

    if (keys.length === 0) {
      throw new Error(`ECDSA key with label '${keyLabel}' not found`);
    }

    const hPrivKey = keys[0];
    const mech = enforceMech('ECDSA_P384');

    ctx.p11.C_SignInit(ctx.session, mech, hPrivKey);
    const signature = ctx.p11.C_Sign(ctx.session, data);

    otelService.addSpanAttributes({
      'ecdsa.key_label': keyLabel,
      'ecdsa.data_length': data.length,
      'ecdsa.signature_length': signature.length,
    });

    return Buffer.from(signature);
  } catch (error: any) {
    console.error('ECDSA-P384 signing failed:', error);
    otelService.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    throw error;
  } finally {
    span?.end();
  }
}

/**
 * Clean shutdown of PKCS#11 context
 */
export function finalizePKCS11(ctx: PKCS11Context): void {
  try {
    ctx.p11.C_CloseSession(ctx.session);
  } catch (error) {
    console.warn('Failed to close PKCS#11 session:', error);
  }

  try {
    ctx.p11.C_Finalize();
  } catch (error) {
    console.warn('Failed to finalize PKCS#11:', error);
  }
}
