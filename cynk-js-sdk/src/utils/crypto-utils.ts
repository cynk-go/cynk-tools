import { createHash, randomBytes, pbkdf2, createHmac, createCipheriv, createDecipheriv, generateKeyPair, createSign, createVerify } from 'crypto';
import { promisify } from 'util';

export type HashAlgorithm = 'sha256' | 'sha384' | 'sha512' | 'blake2b512' | 'md5' | 'sha1';
export type EncryptAlgorithm = 'aes-256-gcm' | 'aes-256-cbc' | 'aes-128-gcm' | 'aes-128-cbc' | 'chacha20-poly1305';
export type KeyFormat = 'pem' | 'der' | 'jwk' | 'raw';
export type KDFAlgorithm = 'pbkdf2' | 'scrypt' | 'argon2id';

const pbkdf2Async = promisify(pbkdf2);
const generateKeyPairAsync = promisify(generateKeyPair);
const randomBytesAsync = promisify(randomBytes);

class CryptoUtils {
  async generateHash(data: Buffer, algorithm: HashAlgorithm = 'sha256'): Promise<string> {
    try {
      const hash = createHash(algorithm);
      hash.update(data);
      return hash.digest('hex');
    } catch (error) {
      throw new Error(`Failed to generate hash: ${(error as Error).message}`);
    }
  }

  async verifyHash(data: Buffer, hash: string, algorithm: HashAlgorithm = 'sha256'): Promise<boolean> {
    try {
      const computedHash = await this.generateHash(data, algorithm);
      return computedHash === hash;
    } catch (error) {
      throw new Error(`Failed to verify hash: ${(error as Error).message}`);
    }
  }

  async encryptData(data: Buffer, key: string, algorithm: EncryptAlgorithm = 'aes-256-gcm'): Promise<Buffer> {
    try {
      const keyBuffer = this.normalizeKey(key, algorithm);
      const iv = await randomBytesAsync(16);
      
      const cipher = createCipheriv(algorithm, keyBuffer, iv, {
        authTagLength: algorithm.includes('gcm') || algorithm.includes('poly1305') ? 16 : undefined
      });
      
      const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
      
      if (algorithm.includes('gcm') || algorithm.includes('poly1305')) {
        const authTag = cipher.getAuthTag();
        return Buffer.concat([iv, authTag, encrypted]);
      }
      
      return Buffer.concat([iv, encrypted]);
    } catch (error) {
      throw new Error(`Failed to encrypt data: ${(error as Error).message}`);
    }
  }

  async decryptData(data: Buffer, key: string, algorithm: EncryptAlgorithm = 'aes-256-gcm'): Promise<Buffer> {
    try {
      const keyBuffer = this.normalizeKey(key, algorithm);
      
      let iv: Buffer, authTag: Buffer, encrypted: Buffer;
      
      if (algorithm.includes('gcm') || algorithm.includes('poly1305')) {
        iv = data.subarray(0, 16);
        authTag = data.subarray(16, 32);
        encrypted = data.subarray(32);
      } else {
        iv = data.subarray(0, 16);
        encrypted = data.subarray(16);
      }
      
      const decipher = createDecipheriv(algorithm, keyBuffer, iv, {
        authTagLength: algorithm.includes('gcm') || algorithm.includes('poly1305') ? 16 : undefined
      });
      
      if (algorithm.includes('gcm') || algorithm.includes('poly1305')) {
        decipher.setAuthTag(authTag);
      }
      
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted;
    } catch (error) {
      throw new Error(`Failed to decrypt data: ${(error as Error).message}`);
    }
  }

  async generateRandomBytes(length: number): Promise<Buffer> {
    try {
      return await randomBytesAsync(length);
    } catch (error) {
      throw new Error(`Failed to generate random bytes: ${(error as Error).message}`);
    }
  }

  async deriveKey(password: string, salt: Buffer, algorithm: KDFAlgorithm = 'pbkdf2', iterations: number = 100000, keyLength: number = 32): Promise<string> {
    try {
      switch (algorithm) {
        case 'pbkdf2':
          const derivedKey = await pbkdf2Async(password, salt, iterations, keyLength, 'sha256');
          return derivedKey.toString('hex');
        
        case 'scrypt':
          const { scrypt } = await import('crypto');
          const scryptAsync = promisify(scrypt);
          const scryptKey = await scryptAsync(password, salt, keyLength, { N: 16384, r: 8, p: 1 }) as Buffer;
          return scryptKey.toString('hex');
        
        case 'argon2id':
          const argon2 = await import('argon2');
          const argon2Key = await argon2.hash(password, {
            type: argon2.argon2id,
            salt: salt,
            hashLength: keyLength,
            timeCost: 3,
            memoryCost: 4096,
            parallelism: 1
          });
          return Buffer.from(argon2Key).toString('hex');
        
        default:
          throw new Error(`Unsupported KDF algorithm: ${algorithm}`);
      }
    } catch (error) {
      throw new Error(`Failed to derive key: ${(error as Error).message}`);
    }
  }

  async computeHMAC(data: Buffer, key: Buffer, algorithm: HashAlgorithm = 'sha256'): Promise<Buffer> {
    try {
      const hmac = createHmac(algorithm, key);
      hmac.update(data);
      return hmac.digest();
    } catch (error) {
      throw new Error(`Failed to compute HMAC: ${(error as Error).message}`);
    }
  }

  encodeBase64(data: Buffer): string {
    return data.toString('base64');
  }

  decodeBase64(data: string): Buffer {
    return Buffer.from(data, 'base64');
  }

  encodeBase64URL(data: Buffer): string {
    return data.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  decodeBase64URL(data: string): Buffer {
    let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (base64.length % 4)) % 4;
    base64 += '='.repeat(padLength);
    return Buffer.from(base64, 'base64');
  }

  async validateKeyFormat(key: string, format: KeyFormat): Promise<boolean> {
    try {
      switch (format) {
        case 'pem':
          return this.isValidPEM(key);
        
        case 'der':
          return this.isValidDER(key);
        
        case 'jwk':
          return this.isValidJWK(key);
        
        case 'raw':
          return Buffer.from(key, 'hex').length > 0;
        
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  async generateKeyFingerprint(key: Buffer, algorithm: HashAlgorithm = 'sha256'): Promise<string> {
    try {
      const hash = await this.generateHash(key, algorithm);
      return this.formatFingerprint(hash);
    } catch (error) {
      throw new Error(`Failed to generate key fingerprint: ${(error as Error).message}`);
    }
  }

  async generateKeyPair(algorithm: 'rsa' | 'ec' | 'ed25519', options: any = {}): Promise<{ publicKey: string; privateKey: string }> {
    try {
      const keyOptions: any = {};

      switch (algorithm) {
        case 'rsa':
          keyOptions.modulusLength = options.modulusLength || 4096;
          keyOptions.publicExponent = options.publicExponent || 0x10001;
          keyOptions.privateKeyEncoding = {
            type: 'pkcs8',
            format: 'pem'
          };
          keyOptions.publicKeyEncoding = {
            type: 'spki',
            format: 'pem'
          };
          break;

        case 'ec':
          keyOptions.namedCurve = options.namedCurve || 'secp384r1';
          keyOptions.privateKeyEncoding = {
            type: 'pkcs8',
            format: 'pem'
          };
          keyOptions.publicKeyEncoding = {
            type: 'spki',
            format: 'pem'
          };
          break;

        case 'ed25519':
          keyOptions.privateKeyEncoding = {
            type: 'pkcs8',
            format: 'pem'
          };
          keyOptions.publicKeyEncoding = {
            type: 'spki',
            format: 'pem'
          };
          break;

        default:
          throw new Error(`Unsupported key pair algorithm: ${algorithm}`);
      }

      const { publicKey, privateKey } = await generateKeyPairAsync(algorithm, keyOptions);
      
      return {
        publicKey: publicKey.toString(),
        privateKey: privateKey.toString()
      };
    } catch (error) {
      throw new Error(`Failed to generate key pair: ${(error as Error).message}`);
    }
  }

  async signData(data: Buffer, privateKey: string, algorithm: 'rsa-sha256' | 'ecdsa-sha384' | 'ed25519' = 'rsa-sha256'): Promise<string> {
    try {
      const sign = createSign(this.getSignAlgorithm(algorithm));
      sign.update(data);
      sign.end();
      
      const signature = sign.sign(privateKey);
      return this.encodeBase64URL(signature);
    } catch (error) {
      throw new Error(`Failed to sign data: ${(error as Error).message}`);
    }
  }

  async verifySignature(data: Buffer, signature: string, publicKey: string, algorithm: 'rsa-sha256' | 'ecdsa-sha384' | 'ed25519' = 'rsa-sha256'): Promise<boolean> {
    try {
      const verify = createVerify(this.getSignAlgorithm(algorithm));
      verify.update(data);
      verify.end();
      
      const signatureBuffer = this.decodeBase64URL(signature);
      return verify.verify(publicKey, signatureBuffer);
    } catch (error) {
      throw new Error(`Failed to verify signature: ${(error as Error).message}`);
    }
  }

  async generateSecurePassword(length: number = 16, options: {
    uppercase?: boolean;
    lowercase?: boolean;
    numbers?: boolean;
    symbols?: boolean;
  } = {}): Promise<string> {
    const {
      uppercase = true,
      lowercase = true,
      numbers = true,
      symbols = true
    } = options;

    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let charPool = '';
    if (uppercase) charPool += uppercaseChars;
    if (lowercase) charPool += lowercaseChars;
    if (numbers) charPool += numberChars;
    if (symbols) charPool += symbolChars;

    if (charPool.length === 0) {
      throw new Error('No character types selected for password generation');
    }

    const randomBytes = await this.generateRandomBytes(length);
    let password = '';

    for (let i = 0; i < length; i++) {
      password += charPool[randomBytes[i] % charPool.length];
    }

    return password;
  }

  async generateSalt(length: number = 32): Promise<string> {
    const salt = await this.generateRandomBytes(length);
    return salt.toString('hex');
  }

  async createKeyDerivation(password: string, saltLength: number = 32): Promise<{ salt: string; derivedKey: string }> {
    const salt = await this.generateSalt(saltLength);
    const saltBuffer = Buffer.from(salt, 'hex');
    const derivedKey = await this.deriveKey(password, saltBuffer, 'pbkdf2');
    
    return { salt, derivedKey };
  }

  async verifyKeyDerivation(password: string, salt: string, expectedKey: string): Promise<boolean> {
    const saltBuffer = Buffer.from(salt, 'hex');
    const derivedKey = await this.deriveKey(password, saltBuffer, 'pbkdf2');
    return derivedKey === expectedKey;
  }

  async createEncryptedContainer(data: Buffer, password: string, algorithm: EncryptAlgorithm = 'aes-256-gcm'): Promise<Buffer> {
    const salt = await this.generateRandomBytes(32);
    const derivedKey = await this.deriveKey(password, salt, 'pbkdf2');
    const encryptedData = await this.encryptData(data, derivedKey, algorithm);
    
    return Buffer.concat([salt, encryptedData]);
  }

  async decryptContainer(container: Buffer, password: string, algorithm: EncryptAlgorithm = 'aes-256-gcm'): Promise<Buffer> {
    const salt = container.subarray(0, 32);
    const encryptedData = container.subarray(32);
    
    const derivedKey = await this.deriveKey(password, salt, 'pbkdf2');
    return await this.decryptData(encryptedData, derivedKey, algorithm);
  }

  async generateUUID(): Promise<string> {
    const randomBytes = await this.generateRandomBytes(16);
    
    randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;
    randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;
    
    const hex = randomBytes.toString('hex');
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
  }

  async createDigitalEnvelope(data: Buffer, publicKey: string): Promise<{ encryptedKey: string; encryptedData: string; iv: string }> {
    const sessionKey = await this.generateRandomBytes(32);
    const iv = await this.generateRandomBytes(16);
    
    const encryptedData = await this.encryptData(data, sessionKey.toString('hex'), 'aes-256-gcm');
    const encryptedKey = await this.encryptData(sessionKey, publicKey, 'aes-256-gcm');
    
    return {
      encryptedKey: this.encodeBase64URL(encryptedKey),
      encryptedData: this.encodeBase64URL(encryptedData),
      iv: this.encodeBase64URL(iv)
    };
  }

  async openDigitalEnvelope(envelope: { encryptedKey: string; encryptedData: string; iv: string }, privateKey: string): Promise<Buffer> {
    const encryptedKey = this.decodeBase64URL(envelope.encryptedKey);
    const encryptedData = this.decodeBase64URL(envelope.encryptedData);
    const iv = this.decodeBase64URL(envelope.iv);
    
    const sessionKey = await this.decryptData(encryptedKey, privateKey, 'aes-256-gcm');
    return await this.decryptData(encryptedData, sessionKey.toString('hex'), 'aes-256-gcm');
  }

  private normalizeKey(key: string, algorithm: EncryptAlgorithm): Buffer {
    let keyBuffer: Buffer;
    
    if (key.startsWith('hex:')) {
      keyBuffer = Buffer.from(key.substring(4), 'hex');
    } else if (key.startsWith('base64:')) {
      keyBuffer = Buffer.from(key.substring(7), 'base64');
    } else {
      keyBuffer = Buffer.from(key, 'utf8');
    }
    
    const requiredLength = algorithm.includes('256') ? 32 : 16;
    
    if (keyBuffer.length < requiredLength) {
      const hash = createHash('sha256');
      hash.update(keyBuffer);
      return hash.digest().subarray(0, requiredLength);
    } else if (keyBuffer.length > requiredLength) {
      return keyBuffer.subarray(0, requiredLength);
    }
    
    return keyBuffer;
  }

  private isValidPEM(key: string): boolean {
    return key.includes('-----BEGIN') && key.includes('-----END');
  }

  private isValidDER(key: string): boolean {
    try {
      Buffer.from(key, 'base64');
      return true;
    } catch {
      return false;
    }
  }

  private isValidJWK(key: string): boolean {
    try {
      const jwk = JSON.parse(key);
      return typeof jwk === 'object' && (jwk.kty !== undefined || jwk.crv !== undefined);
    } catch {
      return false;
    }
  }

  private formatFingerprint(hash: string): string {
    const chunks = [];
    for (let i = 0; i < hash.length; i += 2) {
      chunks.push(hash.substring(i, i + 2));
    }
    return chunks.join(':').toUpperCase();
  }

  private getSignAlgorithm(algorithm: string): string {
    const algorithmMap: Record<string, string> = {
      'rsa-sha256': 'RSA-SHA256',
      'ecdsa-sha384': 'ECDSA-SHA384',
      'ed25519': 'Ed25519'
    };
    return algorithmMap[algorithm] || algorithm;
  }
}

export class CryptoManager {
  private cryptoUtils: CryptoUtils;
  private keyStore: Map<string, { key: Buffer; expiresAt?: number }> = new Map();

  constructor() {
    this.cryptoUtils = new CryptoUtils();
  }

  async storeKey(keyId: string, key: Buffer, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + ttl : undefined;
    this.keyStore.set(keyId, { key, expiresAt });
    
    if (ttl) {
      setTimeout(() => {
        this.keyStore.delete(keyId);
      }, ttl);
    }
  }

  async getKey(keyId: string): Promise<Buffer | null> {
    const keyData = this.keyStore.get(keyId);
    
    if (!keyData) {
      return null;
    }
    
    if (keyData.expiresAt && Date.now() > keyData.expiresAt) {
      this.keyStore.delete(keyId);
      return null;
    }
    
    return keyData.key;
  }

  async removeKey(keyId: string): Promise<boolean> {
    return this.keyStore.delete(keyId);
  }

  async rotateKey(keyId: string, newKey: Buffer, ttl?: number): Promise<void> {
    await this.storeKey(keyId, newKey, ttl);
  }

  async encryptWithStoredKey(keyId: string, data: Buffer, algorithm: EncryptAlgorithm = 'aes-256-gcm'): Promise<Buffer> {
    const key = await this.getKey(keyId);
    if (!key) {
      throw new Error(`Key not found: ${keyId}`);
    }
    
    return await this.cryptoUtils.encryptData(data, key.toString('hex'), algorithm);
  }

  async decryptWithStoredKey(keyId: string, data: Buffer, algorithm: EncryptAlgorithm = 'aes-256-gcm'): Promise<Buffer> {
    const key = await this.getKey(keyId);
    if (!key) {
      throw new Error(`Key not found: ${keyId}`);
    }
    
    return await this.cryptoUtils.decryptData(data, key.toString('hex'), algorithm);
  }

  async generateAndStoreKey(keyId: string, keyLength: number = 32, ttl?: number): Promise<string> {
    const key = await this.cryptoUtils.generateRandomBytes(keyLength);
    await this.storeKey(keyId, key, ttl);
    return key.toString('hex');
  }

  getKeyCount(): number {
    return this.keyStore.size;
  }

  clearExpiredKeys(): void {
    const now = Date.now();
    for (const [keyId, keyData] of this.keyStore.entries()) {
      if (keyData.expiresAt && now > keyData.expiresAt) {
        this.keyStore.delete(keyId);
      }
    }
  }

  clearAllKeys(): void {
    this.keyStore.clear();
  }
}

export const cryptoUtils = new CryptoUtils();
export const cryptoManager = new CryptoManager();

export async function generateHash(data: Buffer, algorithm?: HashAlgorithm): Promise<string> {
  return cryptoUtils.generateHash(data, algorithm);
}

export async function verifyHash(data: Buffer, hash: string, algorithm?: HashAlgorithm): Promise<boolean> {
  return cryptoUtils.verifyHash(data, hash, algorithm);
}

export async function encryptData(data: Buffer, key: string, algorithm?: EncryptAlgorithm): Promise<Buffer> {
  return cryptoUtils.encryptData(data, key, algorithm);
}

export async function decryptData(data: Buffer, key: string, algorithm?: EncryptAlgorithm): Promise<Buffer> {
  return cryptoUtils.decryptData(data, key, algorithm);
}

export async function generateRandomBytes(length: number): Promise<Buffer> {
  return cryptoUtils.generateRandomBytes(length);
}

export async function deriveKey(password: string, salt: Buffer, algorithm?: KDFAlgorithm, iterations?: number, keyLength?: number): Promise<string> {
  return cryptoUtils.deriveKey(password, salt, algorithm, iterations, keyLength);
}

export async function computeHMAC(data: Buffer, key: Buffer, algorithm?: HashAlgorithm): Promise<Buffer> {
  return cryptoUtils.computeHMAC(data, key, algorithm);
}

export function encodeBase64(data: Buffer): string {
  return cryptoUtils.encodeBase64(data);
}

export function decodeBase64(data: string): Buffer {
  return cryptoUtils.decodeBase64(data);
}

export function encodeBase64URL(data: Buffer): string {
  return cryptoUtils.encodeBase64URL(data);
}

export function decodeBase64URL(data: string): Buffer {
  return cryptoUtils.decodeBase64URL(data);
}

export async function validateKeyFormat(key: string, format: KeyFormat): Promise<boolean> {
  return cryptoUtils.validateKeyFormat(key, format);
}

export async function generateKeyFingerprint(key: Buffer, algorithm?: HashAlgorithm): Promise<string> {
  return cryptoUtils.generateKeyFingerprint(key, algorithm);
}

export async function generateKeyPair(algorithm?: 'rsa' | 'ec' | 'ed25519', options?: any): Promise<{ publicKey: string; privateKey: string }> {
  return cryptoUtils.generateKeyPair(algorithm, options);
}

export async function signData(data: Buffer, privateKey: string, algorithm?: 'rsa-sha256' | 'ecdsa-sha384' | 'ed25519'): Promise<string> {
  return cryptoUtils.signData(data, privateKey, algorithm);
}

export async function verifySignature(data: Buffer, signature: string, publicKey: string, algorithm?: 'rsa-sha256' | 'ecdsa-sha384' | 'ed25519'): Promise<boolean> {
  return cryptoUtils.verifySignature(data, signature, publicKey, algorithm);
}

export async function generateSecurePassword(length?: number, options?: {
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
}): Promise<string> {
  return cryptoUtils.generateSecurePassword(length, options);
}

export async function generateSalt(length?: number): Promise<string> {
  return cryptoUtils.generateSalt(length);
}

export async function createKeyDerivation(password: string, saltLength?: number): Promise<{ salt: string; derivedKey: string }> {
  return cryptoUtils.createKeyDerivation(password, saltLength);
}

export async function verifyKeyDerivation(password: string, salt: string, expectedKey: string): Promise<boolean> {
  return cryptoUtils.verifyKeyDerivation(password, salt, expectedKey);
}

export async function createEncryptedContainer(data: Buffer, password: string, algorithm?: EncryptAlgorithm): Promise<Buffer> {
  return cryptoUtils.createEncryptedContainer(data, password, algorithm);
}

export async function decryptContainer(container: Buffer, password: string, algorithm?: EncryptAlgorithm): Promise<Buffer> {
  return cryptoUtils.decryptContainer(container, password, algorithm);
}

export async function generateUUID(): Promise<string> {
  return cryptoUtils.generateUUID();
}

export async function createDigitalEnvelope(data: Buffer, publicKey: string): Promise<{ encryptedKey: string; encryptedData: string; iv: string }> {
  return cryptoUtils.createDigitalEnvelope(data, publicKey);
}

export async function openDigitalEnvelope(envelope: { encryptedKey: string; encryptedData: string; iv: string }, privateKey: string): Promise<Buffer> {
  return cryptoUtils.openDigitalEnvelope(envelope, privateKey);
}