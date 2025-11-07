# cynk-cli - Comprehensive Documentation

## Project Overview
cynk-cli is the official command-line tool for the cynk plugin ecosystem. It provides developers with everything needed to create, package, sign, validate, and publish plugins to cynk applications using the custom `.cpgx` format.

---

## **COMPLETE FILE & FOLDER STRUCTURE DOCUMENTATION**

### **ROOT LEVEL**

- **`go.mod`** - Go module definition and dependency management
- **`go.sum`** - Go dependency checksums for secure builds
- **`Makefile`** - Build automation with targets for development, testing, and release
- **`.goreleaser.yml`** - Configuration for automated binary releases across multiple platforms
- **`README.md`** - Project documentation and getting started guide
- **`LICENSE`** - Software license terms and conditions

---

### **`cmd/cynk-cli/`** - COMMAND LINE INTERFACE IMPLEMENTATION

#### **`main.go`** - CLI Application Entry Point
- **Function**: Primary application bootstrap and command routing
- **Responsibilities**: 
  - CLI framework initialization (Cobra)
  - Global flag parsing and validation
  - Configuration loading and environment setup
  - Color theme initialization and terminal detection
  - Error handling setup and recovery mechanisms
  - Command routing and execution orchestration
- **Core Methods**:
  - `main()` - Application entry point with panic recovery
  - `initConfig()` - Configuration system initialization
  - `setupLogging()` - Structured logging configuration
  - `detectTerminal()` - Terminal capability detection for colors
  - `loadColorTheme()` - Color theme loading and validation
  - `execute()` - Main command execution with timing
  - `handleGlobalFlags()` - Global flag processing (--verbose, --no-color, etc.)

#### **`init.go`** - Plugin Project Initialization Command
- **Function**: Create new plugin projects from templates
- **Core Methods**:
  - `runInit()` - Main initialization workflow orchestration
  - `validateProjectName()` - Project name validation and sanitization
  - `selectTemplate()` - Interactive template selection with preview
  - `generateProjectStructure()` - Directory structure creation
  - `scaffoldFromTemplate()` - Template file generation and customization
  - `customizeManifest()` - Manifest.json population with user inputs
  - `installDependencies()` - Optional dependency installation
  - `validateNewProject()` - Post-creation validation
  - `showNextSteps()` - Display getting started instructions

#### **`pack.go`** - .cpgx Package Creation Command
- **Function**: Package plugin projects into .cpgx format
- **Core Methods**:
  - `runPack()` - Main packaging workflow
  - `discoverProject()` - Auto-detect project type and structure
  - `validatePackagingReady()` - Pre-packaging validation checks
  - `buildPackageStructure()` - Create in-memory package structure
  - `compressAssets()` - Asset compression with multiple algorithms
  - `generateChecksums()` - File integrity checksum generation
  - `createCPGXArchive()` - Final .cpgx file creation
  - `validateOutputPackage()` - Post-packaging integrity verification
  - `calculatePackageStats()` - Package size and composition analytics

#### **`sign.go`** - Cryptographic Signing Command
- **Function**: Apply digital signatures to .cpgx packages
- **Core Methods**:
  - `runSign()` - Main signing workflow
  - `loadSigningKey()` - Private key loading and decryption
  - `validateSigningKey()` - Key format and capability validation
  - `calculatePackageHash()` - Content hash for signing
  - `createDigitalSignature()` - Cryptographic signature generation
  - `embedSignature()` - Signature embedding in .cpgx
  - `verifyEmbeddedSignature()` - Post-signature verification
  - `generateSignatureReport()` - Detailed signing report
  - `handleKeyGeneration()` - New key pair generation workflow

#### **`verify.go`** - Package Verification Command
- **Function**: Verify .cpgx package integrity and signatures
- **Core Methods**:
  - `runVerify()` - Main verification workflow
  - `validateCPGXStructure()` - Package format and structure validation
  - `extractSignature()` - Signature extraction from package
  - `loadVerificationKey()` - Public key loading for verification
  - `verifyDigitalSignature()` - Cryptographic signature validation
  - `validateManifest()` - Manifest schema and content validation
  - `checkFileIntegrity()` - File checksum verification
  - `verifyDependencies()` - Dependency declaration validation
  - `generateVerificationReport()` - Comprehensive verification report

#### **`publish.go`** - Plugin Publishing Command
- **Function**: Upload .cpgx packages to cynk instances
- **Core Methods**:
  - `runPublish()` - Main publishing workflow
  - `discoverCynkInstance()` - Auto-discover cynk endpoints
  - `authenticateUser()` - User authentication and token management
  - `validatePublishReady()` - Pre-publish validation checks
  - `uploadPackage()` - Secure package upload with progress
  - `handleUploadResponse()` - Server response processing
  - `waitForProcessing()` - Server-side processing monitoring
  - `checkPublishStatus()` - Publication status verification
  - `generatePublishReport()` - Publication results and next steps

#### **`validate.go`** - Project Validation Command
- **Function**: Comprehensive plugin project validation
- **Core Methods**:
  - `runValidate()` - Main validation workflow
  - `performStructureValidation()` - Project structure validation
  - `validateManifestCompliance()` - Manifest schema compliance
  - `checkSecurityConstraints()` - Security policy compliance
  - `verifyDependencyCompatibility()` - Dependency compatibility checks
  - `analyzePerformanceCharacteristics()` - Performance characteristic analysis
  - `validatePlatformCompatibility()` - Target platform compatibility
  - `generateValidationReport()` - Detailed validation report
  - `suggestFixes()` - Automated fix suggestions for issues

#### **`template.go`** - Template Management Command
- **Function**: Template system management and customization
- **Core Methods**:
  - `runTemplate()` - Main template management workflow
  - `listAvailableTemplates()` - Available template listing with details
  - `previewTemplate()` - Template preview with syntax highlighting
  - `createCustomTemplate()` - Custom template creation from existing project
  - `validateTemplateStructure()` - Template structure validation
  - `registerCustomTemplate()` - Custom template registration
  - `updateTemplate()` - Template updates and version management
  - `removeTemplate()` - Template removal and cleanup
  - `exportTemplate()` - Template export for sharing

#### **`manifest.go`** - Manifest Management Command
- **Function**: Plugin manifest generation and management
- **Core Methods**:
  - `runManifest()` - Main manifest management workflow
  - `generateNewManifest()` - New manifest generation with defaults
  - `validateExistingManifest()` - Existing manifest validation
  - `updateManifestField()` - Specific field updates
  - `bumpVersion()` - Semantic version incrementing
  - `migrateManifest()` - Manifest version migration
  - `exportManifestSchema()` - Schema export for documentation
  - `compareManifests()` - Manifest comparison and diff generation

#### **`key.go`** - Cryptographic Key Management Command
- **Function**: Key pair generation and management
- **Core Methods**:
  - `runKey()` - Main key management workflow
  - `generateKeyPair()` - New key pair generation
  - `importExistingKeys()` - Existing key import
  - `exportPublicKey()` - Public key export in multiple formats
  - `listManagedKeys()` - Managed key listing with details
  - `validateKeyPair()` - Key pair validation and testing
  - `rotateKeys()` - Key rotation and migration
  - `backupKeys()` - Secure key backup generation
  - `revokeKeys()` - Key revocation management

#### **`info.go`** - Package Inspection Command
- **Function**: .cpgx package inspection and analytics
- **Core Methods**:
  - `runInfo()` - Main package inspection workflow
  - `extractPackageMetadata()` - Package metadata extraction
  - `analyzePackageStructure()` - Package structure analysis
  - `listPackageContents()` - Detailed content listing
  - `calculateSizeBreakdown()` - Size analysis and breakdown
  - `verifyPackageIntegrity()` - Package integrity verification
  - `generateInspectionReport()` - Comprehensive inspection report
  - `comparePackages()` - Multiple package comparison

#### **`extract.go`** - Package Extraction Command
- **Function**: .cpgx package extraction and exploration
- **Core Methods**:
  - `runExtract()` - Main extraction workflow
  - `validateExtractionPath()` - Extraction path validation
  - `performSafeExtraction()` - Secure package extraction
  - `preserveFileAttributes()` - File metadata preservation
  - `handleExtractionConflicts()` - File conflict resolution
  - `verifyExtractionIntegrity()` - Extraction integrity verification
  - `cleanupExtraction()` - Extraction cleanup and rollback
  - `generateExtractionReport()` - Extraction results report

#### **`config.go`** - CLI Configuration Command
- **Function**: CLI configuration management
- **Core Methods**:
  - `runConfig()` - Main configuration workflow
  - `setConfigurationValue()` - Configuration value setting
  - `getConfigurationValue()` - Configuration value retrieval
  - `listAllConfiguration()` - Complete configuration listing
  - `resetConfiguration()` - Configuration reset to defaults
  - `validateConfiguration()` - Configuration validation
  - `exportConfiguration()` - Configuration export
  - `importConfiguration()` - Configuration import

#### **`login.go`** - Authentication Command
- **Function**: User authentication for cynk instances
- **Core Methods**:
  - `runLogin()` - Main authentication workflow
  - `discoverAuthEndpoint()` - Authentication endpoint discovery
  - `performInteractiveLogin()` - Interactive login flow
  - `handleTokenStorage()` - Secure token storage management
  - `validateStoredTokens()` - Token validation and refresh
  - `logoutUser()` - User logout and token revocation
  - `checkLoginStatus()` - Login status verification

#### **`version.go`** - Version Information Command
- **Function**: Version information and update checking
- **Core Methods**:
  - `runVersion()` - Main version workflow
  - `displayVersionInfo()` - Version information display
  - `checkForUpdates()` - Update availability checking
  - `compareVersions()` - Version comparison
  - `displayChangelog()` - Changelog display
  - `performSelfUpdate()` - Automatic self-update
  - `validateBinaryIntegrity()` - Binary integrity verification

---

### **`pkg/`** - CORE FUNCTIONALITY PACKAGES

#### **`pkg/cpgx/`** - .cpgx Format Handling

- **`packer.go`** - .cpgx Package Creation Engine
  - **Function**: Create .cpgx packages from plugin projects
  - **Core Methods**:
    - `CreatePackage(projectPath, outputPath string, config PackConfig) (PackageResult, error)` - Main package creation
    - `BuildPackageManifest(projectPath string) (PluginManifest, error)` - Manifest generation
    - `CollectPackageFiles(projectPath string, rules InclusionRules) ([]PackageFile, error)` - File collection
    - `CompressPackageFiles(files []PackageFile, level CompressionLevel) ([]CompressedFile, error)` - File compression
    - `CalculateFileChecksums(files []PackageFile) (map[string]string, error)` - Checksum calculation
    - `CreatePackageArchive(files []CompressedFile, manifest PluginManifest, outputPath string) error` - Archive creation
    - `ValidatePackageStructure(archivePath string) (ValidationResult, error)` - Structure validation
    - `OptimizePackageSize(archivePath string, strategies []OptimizationStrategy) (OptimizationResult, error)` - Size optimization

- **`structure_builder.go`** - Package Structure Construction
  - **Function**: Build and validate package directory structures
  - **Core Methods**:
    - `BuildStandardStructure(projectType ProjectType) (PackageStructure, error)` - Standard structure creation
    - `ValidateProjectStructure(projectPath string) (StructureValidation, error)` - Structure validation
    - `DetectProjectType(projectPath string) (ProjectType, error)` - Project type detection
    - `GenerateDirectoryTree(basePath string) (DirectoryTree, error)` - Directory tree generation
    - `CheckRequiredFiles(structure PackageStructure, projectPath string) ([]MissingFile, error)` - Required file checking
    - `CreateMissingStructure(projectPath string, structure PackageStructure) error` - Structure creation
    - `NormalizePaths(projectPath string, files []string) ([]string, error)` - Path normalization

- **`compression.go`** - Compression Algorithm Management
  - **Function**: File compression with multiple algorithms
  - **Core Methods**:
    - `CompressData(data []byte, algorithm CompressionAlgorithm) ([]byte, error)` - Data compression
    - `DecompressData(compressed []byte, algorithm CompressionAlgorithm) ([]byte, error)` - Data decompression
    - `SelectOptimalAlgorithm(files []PackageFile) (CompressionAlgorithm, error)` - Algorithm selection
    - `CalculateCompressionRatio(original, compressed []byte) (float64, error)` - Ratio calculation
    - `BenchmarkAlgorithms(files []PackageFile) ([]AlgorithmBenchmark, error)` - Algorithm benchmarking
    - `CreateCompressionDictionary(files []PackageFile) ([]byte, error)` - Dictionary creation
    - `OptimizeCompressionLevel(data []byte, algorithm CompressionAlgorithm) (CompressionLevel, error)` - Level optimization

- **`extractor.go`** - Package Extraction Engine
  - **Function**: Extract .cpgx packages with validation
  - **Core Methods**:
    - `ExtractPackage(archivePath, outputPath string, config ExtractConfig) (ExtractResult, error)` - Main extraction
    - `ValidateExtractionPath(outputPath string) (PathValidation, error)` - Path validation
    - `ReadPackageMetadata(archivePath string) (PackageMetadata, error)` - Metadata reading
    - `ListPackageContents(archivePath string) ([]PackageFile, error)` - Content listing
    - `VerifyPackageIntegrity(archivePath string) (IntegrityResult, error)` - Integrity verification
    - `HandleExtractionConflicts(files []string, outputPath string, resolution ConflictResolution) error` - Conflict handling
    - `PreserveFileAttributes(files []PackageFile, outputPath string) error` - Attribute preservation
    - `CleanupFailedExtraction(outputPath string) error` - Failed extraction cleanup

- **`signer.go`** - Package Signing Engine
  - **Function**: Apply digital signatures to packages
  - **Core Methods**:
    - `SignPackage(archivePath string, privateKey []byte, config SignConfig) (Signature, error)` - Package signing
    - `CalculatePackageHash(archivePath string, algorithm HashAlgorithm) ([]byte, error)` - Hash calculation
    - `CreateSignature(data []byte, privateKey []byte, algorithm SignatureAlgorithm) ([]byte, error)` - Signature creation
    - `EmbedSignature(archivePath string, signature Signature) error` - Signature embedding
    - `ExtractSignature(archivePath string) (Signature, error)` - Signature extraction
    - `ValidateSignatureFormat(signature []byte) (FormatValidation, error)` - Signature format validation
    - `CreateSignatureManifest(files []PackageFile) (SignatureManifest, error)` - Signature manifest creation

- **`verifier.go`** - Package Verification Engine
  - **Function**: Verify package integrity and signatures
  - **Core Methods**:
    - `VerifyPackageSignature(archivePath string, publicKey []byte) (VerificationResult, error)` - Signature verification
    - `VerifyPackageIntegrity(archivePath string) (IntegrityResult, error)` - Integrity verification
    - `ValidateSignatureTimestamp(signature Signature) (TimestampValidation, error)` - Timestamp validation
    - `CheckSignatureRevocation(signature Signature, crlURL string) (RevocationStatus, error)` - Revocation checking
    - `VerifyCertificateChain(certificate []byte, chain []byte) (ChainValidation, error)` - Certificate chain verification
    - `ValidatePackageStructure(archivePath string) (StructureValidation, error)` - Structure validation
    - `GenerateVerificationReport(archivePath string, publicKey []byte) (VerificationReport, error)` - Report generation

- **`validator.go`** - Package Validation Engine
  - **Function**: Comprehensive package validation
  - **Core Methods**:
    - `ValidatePackage(archivePath string, rules ValidationRules) (ValidationResult, error)` - Comprehensive validation
    - `CheckFileSizeLimits(files []PackageFile, limits SizeLimits) ([]SizeViolation, error)` - Size limit checking
    - `ValidateFileTypes(files []PackageFile, allowedTypes []FileType) ([]TypeViolation, error)` - File type validation
    - `CheckSecurityConstraints(files []PackageFile, constraints SecurityConstraints) ([]SecurityViolation, error)` - Security constraint checking
    - `VerifyManifestCompliance(manifest PluginManifest, schema ManifestSchema) (ComplianceResult, error)` - Manifest compliance
    - `ValidateDependencyDeclarations(dependencies []Dependency, available []Dependency) (DependencyValidation, error)` - Dependency validation
    - `GenerateValidationReport(result ValidationResult) (ValidationReport, error)` - Report generation

- **`metadata.go`** - Package Metadata Management
  - **Function**: Package metadata extraction and management
  - **Core Methods**:
    - `ExtractPackageMetadata(archivePath string) (PackageMetadata, error)` - Metadata extraction
    - `ReadManifestFromPackage(archivePath string) (PluginManifest, error)` - Manifest reading
    - `CalculatePackageStatistics(archivePath string) (PackageStats, error)` - Statistics calculation
    - `GeneratePackageSummary(archivePath string) (PackageSummary, error)` - Summary generation
    - `ComparePackageMetadata(metadata1, metadata2 PackageMetadata) (ComparisonResult, error)` - Metadata comparison
    - `ValidateMetadataConsistency(metadata PackageMetadata) (ConsistencyResult, error)` - Consistency validation
    - `UpdatePackageMetadata(archivePath string, updates MetadataUpdate) error` - Metadata updates

- **`format.go`** - Format Constants and Utilities
  - **Function**: .cpgx format constants and utilities
  - **Core Methods**:
    - `GetCPGXVersion() string` - Format version retrieval
    - `ValidateCPGXHeader(header []byte) (bool, error)` - Header validation
    - `GenerateCPGXHeader(version string) ([]byte, error)` - Header generation
    - `GetSupportedCompressionAlgorithms() []CompressionAlgorithm` - Algorithm listing
    - `GetDefaultPackagingConfig() PackConfig` - Default configuration
    - `ValidateCPGXCompatibility(version string) (CompatibilityResult, error)` - Compatibility checking
    - `MigrateToNewFormat(archivePath, newVersion string) error` - Format migration

#### **`pkg/manifest/`** - Manifest Processing System

- **`generator.go`** - Manifest Generation Engine
  - **Function**: Generate plugin manifests with smart defaults
  - **Core Methods**:
    - `GenerateManifest(projectPath string, template ManifestTemplate) (PluginManifest, error)` - Manifest generation
    - `DetectPluginType(projectPath string) (PluginType, error)` - Plugin type detection
    - `InferDependencies(projectPath string) ([]Dependency, error)` - Dependency inference
    - `CalculateDefaultPermissions(projectType PluginType) ([]Permission, error)` - Permission calculation
    - `GenerateUniquePluginID(name string) (string, error)` - Unique ID generation
    - `ValidateGeneratedManifest(manifest PluginManifest) (ValidationResult, error)` - Generated manifest validation
    - `CreateManifestFromTemplate(template ManifestTemplate, values map[string]interface{}) (PluginManifest, error)` - Template-based generation

- **`parser.go`** - Manifest Parsing Engine
  - **Function**: Parse and process manifest files
  - **Core Methods**:
    - `ParseManifestFile(filePath string) (PluginManifest, error)` - File parsing
    - `ParseManifestJSON(data []byte) (PluginManifest, error)` - JSON parsing
    - `ValidateManifestStructure(manifest PluginManifest) (StructureValidation, error)` - Structure validation
    - `ExtractManifestFields(manifest PluginManifest, fields []string) (map[string]interface{}, error)` - Field extraction
    - `MergeManifests(base, overlay PluginManifest) (PluginManifest, error)` - Manifest merging
    - `TransformManifest(manifest PluginManifest, transformations []Transformation) (PluginManifest, error)` - Manifest transformation
    - `SerializeManifest(manifest PluginManifest, format SerializationFormat) ([]byte, error)` - Manifest serialization

- **`validator.go`** - Manifest Validation Engine
  - **Function**: Comprehensive manifest validation
  - **Core Methods**:
    - `ValidateManifest(manifest PluginManifest, schema ManifestSchema) (ValidationResult, error)` - Comprehensive validation
    - `CheckSchemaCompliance(manifest PluginManifest, schema ManifestSchema) (ComplianceResult, error)` - Schema compliance
    - `ValidateVersionFormat(version string) (VersionValidation, error)` - Version format validation
    - `CheckPermissionValidity(permissions []Permission, available []Permission) (PermissionValidation, error)` - Permission validity
    - `ValidateDependencySyntax(dependencies []Dependency) (DependencyValidation, error)` - Dependency syntax validation
    - `CheckFieldConstraints(manifest PluginManifest, constraints FieldConstraints) (ConstraintValidation, error)` - Field constraint checking
    - `GenerateValidationReport(result ValidationResult) (ValidationReport, error)` - Validation report generation

- **`schema.go`** - Schema Definition and Management
  - **Function**: JSON schema management and validation
  - **Core Methods**:
    - `LoadSchema(version string) (ManifestSchema, error)` - Schema loading
    - `ValidateAgainstSchema(manifest PluginManifest, schema ManifestSchema) (SchemaValidation, error)` - Schema validation
    - `GenerateSchemaFromManifest(manifest PluginManifest) (ManifestSchema, error)` - Schema generation
    - `MergeSchemas(schemas []ManifestSchema) (ManifestSchema, error)` - Schema merging
    - `ValidateSchemaCompatibility(schema1, schema2 ManifestSchema) (CompatibilityResult, error)` - Schema compatibility
    - `CreateSchemaPatch(oldSchema, newSchema ManifestSchema) (SchemaPatch, error)` - Schema patch creation
    - `ApplySchemaPatch(schema ManifestSchema, patch SchemaPatch) (ManifestSchema, error)` - Schema patch application

- **`migrations.go`** - Manifest Version Migration
  - **Function**: Manifest version migration and upgrades
  - **Core Methods**:
    - `MigrateManifest(manifest PluginManifest, targetVersion string) (PluginManifest, error)` - Manifest migration
    - `DetectManifestVersion(manifest PluginManifest) (string, error)` - Version detection
    - `GenerateMigrationPlan(fromVersion, toVersion string) (MigrationPlan, error)` - Migration plan generation
    - `ApplyMigrationSteps(manifest PluginManifest, steps []MigrationStep) (PluginManifest, error)` - Migration step application
    - `ValidateMigrationResult(original, migrated PluginManifest) (MigrationValidation, error)` - Migration validation
    - `CreateBackupManifest(manifest PluginManifest) (PluginManifest, error)` - Backup creation
    - `RollbackMigration(migrated PluginManifest, backup PluginManifest) (PluginManifest, error)` - Migration rollback

- **`updater.go`** - Manifest Field Updates
  - **Function**: Manifest field updates and modifications
  - **Core Methods**:
    - `UpdateManifestField(manifest PluginManifest, fieldPath string, value interface{}) (PluginManifest, error)` - Field updates
    - `BumpManifestVersion(manifest PluginManifest, increment VersionIncrement) (PluginManifest, error)` - Version bumping
    - `AddDependency(manifest PluginManifest, dependency Dependency) (PluginManifest, error)` - Dependency addition
    - `RemoveDependency(manifest PluginManifest, dependencyName string) (PluginManifest, error)` - Dependency removal
    - `UpdatePermissions(manifest PluginManifest, permissions []Permission) (PluginManifest, error)` - Permission updates
    - `SetCompatibilityRange(manifest PluginManifest, minVersion, maxVersion string) (PluginManifest, error)` - Compatibility range setting
    - `ValidateFieldUpdate(manifest PluginManifest, fieldPath string, value interface{}) (UpdateValidation, error)` - Update validation

#### **`pkg/crypto/`** - Cryptography System

- **`signer.go`** - Digital Signature Creation
  - **Function**: Create digital signatures for packages
  - **Core Methods**:
    - `CreateSignature(data []byte, privateKey []byte, algorithm SignatureAlgorithm) ([]byte, error)` - Signature creation
    - `GenerateDetachedSignature(data []byte, privateKey []byte) (DetachedSignature, error)` - Detached signature generation
    - `CreateTimestampedSignature(data []byte, privateKey []byte, tsaURL string) (TimestampedSignature, error)` - Timestamped signature
    - `SignWithCertificate(data []byte, privateKey []byte, certificate []byte) (CertificateSignature, error)` - Certificate-based signing
    - `CreateMultipleSignatures(data []byte, keys []SigningKey) ([]Signature, error)` - Multiple signature creation
    - `ValidateSigningKey(key []byte, algorithm SignatureAlgorithm) (KeyValidation, error)` - Signing key validation
    - `CalculateOptimalSignatureSize(data []byte, algorithm SignatureAlgorithm) (int, error)` - Signature size calculation

- **`verifier.go`** - Signature Verification Engine
  - **Function**: Verify digital signatures and certificates
  - **Core Methods**:
    - `VerifySignature(data, signature, publicKey []byte, algorithm SignatureAlgorithm) (VerificationResult, error)` - Signature verification
    - `VerifyDetachedSignature(data []byte, signature DetachedSignature, publicKey []byte) (VerificationResult, error)` - Detached signature verification
    - `VerifyTimestampedSignature(signature TimestampedSignature, publicKey []byte) (TimestampVerification, error)` - Timestamped signature verification
    - `VerifyCertificateSignature(signature CertificateSignature, caBundle []byte) (CertificateVerification, error)` - Certificate signature verification
    - `VerifyMultipleSignatures(data []byte, signatures []Signature, publicKeys [][]byte) ([]VerificationResult, error)` - Multiple signature verification
    - `CheckSignatureExpiry(signature []byte) (ExpiryStatus, error)` - Signature expiry checking
    - `ValidateVerificationKey(key []byte, algorithm SignatureAlgorithm) (KeyValidation, error)` - Verification key validation

- **`key_manager.go`** - Key Pair Management
  - **Function**: Key pair generation and management
  - **Core Methods**:
    - `GenerateKeyPair(algorithm KeyAlgorithm, size int) (KeyPair, error)` - Key pair generation
    - `ImportPrivateKey(keyData []byte, password string) (PrivateKey, error)` - Private key import
    - `ImportPublicKey(keyData []byte) (PublicKey, error)` - Public key import
    - `ExportPrivateKey(key PrivateKey, password string) ([]byte, error)` - Private key export
    - `ExportPublicKey(key PublicKey) ([]byte, error)` - Public key export
    - `ValidateKeyPair(privateKey PrivateKey, publicKey PublicKey) (bool, error)` - Key pair validation
    - `RotateKeyPair(oldKeyPair KeyPair, newAlgorithm KeyAlgorithm) (KeyPair, error)` - Key pair rotation

- **`keystore.go`** - Secure Key Storage
  - **Function**: Secure key storage and retrieval
  - **Core Methods**:
    - `StoreKey(key Key, identifier string, password string) error` - Key storage
    - `RetrieveKey(identifier string, password string) (Key, error)` - Key retrieval
    - `ListStoredKeys() ([]KeyIdentifier, error)` - Stored key listing
    - `DeleteKey(identifier string) error` - Key deletion
    - `BackupKeyStore(backupPath, password string) error` - Key store backup
    - `RestoreKeyStore(backupPath, password string) error` - Key store restoration
    - `ValidateKeyStoreIntegrity() (IntegrityResult, error)` - Key store integrity validation

- **`certificates.go`** - X.509 Certificate Handling
  - **Function**: X.509 certificate management
  - **Core Methods**:
    - `GenerateSelfSignedCertificate(subject CertificateSubject, validity time.Duration) (Certificate, error)` - Self-signed certificate generation
    - `GenerateCSR(subject CertificateSubject, privateKey PrivateKey) (CertificateSigningRequest, error)` - CSR generation
    - `SignCSR(csr CertificateSigningRequest, caPrivateKey PrivateKey, caCertificate Certificate) (Certificate, error)` - CSR signing
    - `ValidateCertificate(certificate Certificate, caBundle []byte) (CertificateValidation, error)` - Certificate validation
    - `CheckCertificateRevocation(certificate Certificate, crlURL string) (RevocationStatus, error)` - Certificate revocation checking
    - `ParseCertificate(data []byte) (Certificate, error)` - Certificate parsing
    - `SerializeCertificate(certificate Certificate, format CertificateFormat) ([]byte, error)` - Certificate serialization

- **`algorithms.go`** - Cryptographic Algorithm Support
  - **Function**: Algorithm management and support
  - **Core Methods**:
    - `GetSupportedAlgorithms() AlgorithmSuite` - Supported algorithm listing
    - `ValidateAlgorithmSupport(algorithm CryptoAlgorithm) (bool, error)` - Algorithm support validation
    - `GetAlgorithmSecurityLevel(algorithm CryptoAlgorithm) (SecurityLevel, error)` - Security level determination
    - `BenchmarkAlgorithm(algorithm CryptoAlgorithm, data []byte) (AlgorithmPerformance, error)` - Algorithm benchmarking
    - `SelectOptimalAlgorithm(requirements AlgorithmRequirements) (CryptoAlgorithm, error)` - Optimal algorithm selection
    - `CheckAlgorithmDeprecation(algorithm CryptoAlgorithm) (DeprecationStatus, error)` - Algorithm deprecation checking
    - `MigrateToNewAlgorithm(oldAlgorithm, newAlgorithm CryptoAlgorithm, data []byte) ([]byte, error)` - Algorithm migration

#### **`pkg/templates/`** - Template System

- **`manager.go`** - Template Management Engine
  - **Function**: Template system management and operations
  - **Core Methods**:
    - `ListTemplates() ([]TemplateInfo, error)` - Template listing
    - `GetTemplate(name string) (Template, error)` - Template retrieval
    - `RegisterTemplate(template Template) error` - Template registration
    - `UnregisterTemplate(name string) error` - Template removal
    - `UpdateTemplate(name string, updates TemplateUpdate) error` - Template updates
    - `ValidateTemplate(template Template) (ValidationResult, error)` - Template validation
    - `SearchTemplates(query string, filters TemplateFilters) ([]TemplateInfo, error)` - Template search

- **`generator.go`** - Template-Based Generation
  - **Function**: Generate projects from templates
  - **Core Methods**:
    - `GenerateFromTemplate(template Template, values map[string]interface{}, outputPath string) (GenerationResult, error)` - Template generation
    - `ProcessTemplateFile(templatePath string, values map[string]interface{}) ([]byte, error)` - File template processing
    - `ValidateTemplateValues(template Template, values map[string]interface{}) (ValidationResult, error)` - Value validation
    - `ApplyTemplateTransformations(content []byte, transformations []Transformation) ([]byte, error)` - Content transformation
    - `HandleTemplateVariables(content []byte, variables map[string]interface{}) ([]byte, error)` - Variable substitution
    - `GenerateTemplatePreview(template Template, values map[string]interface{}) (PreviewResult, error)` - Template preview
    - `CleanupFailedGeneration(outputPath string) error` - Failed generation cleanup

- **`registry.go`** - Template Registry Management
  - **Function**: Template registry operations
  - **Core Methods**:
    - `LoadRegistry() (TemplateRegistry, error)` - Registry loading
    - `SaveRegistry(registry TemplateRegistry) error` - Registry saving
    - `AddTemplateToRegistry(template Template) error` - Template addition
    - `RemoveTemplateFromRegistry(name string) error` - Template removal
    - `UpdateRegistryIndex() error` - Registry index updating
    - `ValidateRegistryIntegrity() (IntegrityResult, error)` - Registry integrity validation
    - `BackupRegistry(backupPath string) error` - Registry backup

- **`custom.go`** - Custom Template Handling
  - **Function**: Custom template creation and management
  - **Core Methods**:
    - `CreateTemplateFromProject(projectPath string, config TemplateConfig) (Template, error)` - Template creation
    - `ValidateCustomTemplate(template Template) (ValidationResult, error)` - Custom template validation
    - `PackageTemplate(template Template, outputPath string) error` - Template packaging
    - `ImportTemplate(packagePath string) (Template, error)` - Template import
    - `ExportTemplate(template Template, outputPath string) error` - Template export
    - `UpdateCustomTemplate(template Template, updates TemplateUpdate) error` - Custom template updates
    - `ShareTemplate(template Template, destination string) error` - Template sharing

- **`scaffold.go`** - Project Scaffolding
  - **Function**: Project scaffolding and structure creation
  - **Core Methods**:
    - `ScaffoldProject(template Template, values map[string]interface{}, outputPath string) (ScaffoldResult, error)` - Project scaffolding
    - `CreateDirectoryStructure(structure DirectoryStructure, outputPath string) error` - Directory structure creation
    - `GenerateProjectFiles(template Template, values map[string]interface{}, outputPath string) error` - File generation
    - `ApplyProjectCustomizations(projectPath string, customizations []Customization) error` - Project customization
    - `ValidateScaffoldedProject(projectPath string, template Template) (ValidationResult, error)` - Scaffolded project validation
    - `GenerateScaffoldingReport(result ScaffoldResult) (ScaffoldingReport, error)` - Scaffolding report generation
    - `CleanupScaffolding(projectPath string) error` - Scaffolding cleanup

#### **`pkg/validator/`** - Validation System

- **`project_validator.go`** - Comprehensive Project Validation
  - **Function**: Complete project validation
  - **Core Methods**:
    - `ValidateProject(projectPath string, rules ValidationRules) (ValidationResult, error)` - Comprehensive validation
    - `CheckProjectStructure(projectPath string, expected StructureExpectation) (StructureValidation, error)` - Structure validation
    - `ValidateSourceCode(projectPath string, rules CodeValidationRules) (CodeValidation, error)` - Source code validation
    - `CheckAssetFiles(projectPath string, rules AssetRules) (AssetValidation, error)` - Asset validation
    - `VerifyBuildArtifacts(projectPath string, rules BuildRules) (BuildValidation, error)` - Build artifact validation
    - `AnalyzeDependencies(projectPath string, rules DependencyRules) (DependencyAnalysis, error)` - Dependency analysis
    - `GenerateValidationReport(result ValidationResult) (ValidationReport, error)` - Validation report generation

- **`structure_checker.go`** - Structure Validation
  - **Function**: Directory and file structure validation
  - **Core Methods**:
    - `ValidateDirectoryStructure(projectPath string, expected StructureDefinition) (StructureValidation, error)` - Directory structure validation
    - `CheckRequiredFiles(projectPath string, required []RequiredFile) ([]MissingFile, error)` - Required file checking
    - `ValidateFilePermissions(projectPath string, rules PermissionRules) (PermissionValidation, error)` - File permission validation
    - `CheckNamingConventions(projectPath string, conventions NamingConventions) (NamingValidation, error)` - Naming convention validation
    - `AnalyzeFileOrganization(projectPath string, rules OrganizationRules) (OrganizationAnalysis, error)` - File organization analysis
    - `DetectStructureIssues(projectPath string) ([]StructureIssue, error)` - Structure issue detection
    - `SuggestStructureImprovements(projectPath string) ([]ImprovementSuggestion, error)` - Structure improvement suggestions

- **`compatibility_checker.go`** - Compatibility Validation
  - **Function**: Platform and version compatibility checking
  - **Core Methods**:
    - `CheckPlatformCompatibility(projectPath string, target PlatformTarget) (CompatibilityResult, error)` - Platform compatibility
    - `ValidateVersionCompatibility(projectPath string, requirements VersionRequirements) (VersionCompatibility, error)` - Version compatibility
    - `CheckDependencyCompatibility(projectPath string, available []Dependency) (DependencyCompatibility, error)` - Dependency compatibility
    - `AnalyzeAPICompatibility(projectPath string, api APIInterface) (APICompatibility, error)` - API compatibility analysis
    - `ValidateSystemRequirements(projectPath string, system SystemSpec) (RequirementValidation, error)` - System requirement validation
    - `CheckBackwardCompatibility(projectPath string, previousVersion string) (BackwardCompatibility, error)` - Backward compatibility checking
    - `GenerateCompatibilityReport(result CompatibilityResult) (CompatibilityReport, error)` - Compatibility report generation

- **`security_scanner.go`** - Security Validation
  - **Function**: Security policy compliance checking
  - **Core Methods**:
    - `ScanSecurity(projectPath string, policies SecurityPolicies) (SecurityScanResult, error)` - Security scanning
    - `CheckVulnerabilities(projectPath string, database VulnerabilityDatabase) (VulnerabilityScan, error)` - Vulnerability checking
    - `ValidateSecurityConfiguration(projectPath string, config SecurityConfig) (ConfigValidation, error)` - Security configuration validation
    - `AnalyzeCodeSecurity(projectPath string, rules CodeSecurityRules) (CodeSecurityAnalysis, error)` - Code security analysis
    - `CheckDependencySecurity(projectPath string, policies DependencySecurityPolicies) (DependencySecurity, error)` - Dependency security checking
    - `ValidateCryptographicPractices(projectPath string, standards CryptoStandards) (CryptoValidation, error)` - Cryptographic practice validation
    - `GenerateSecurityReport(result SecurityScanResult) (SecurityReport, error)` - Security report generation

- **`fixer.go`** - Automated Issue Resolution
  - **Function**: Automatic fix generation for validation issues
  - **Core Methods**:
    - `GenerateFixes(issues []ValidationIssue, projectPath string) ([]Fix, error)` - Fix generation
    - `ApplyFixes(fixes []Fix, projectPath string) (FixResult, error)` - Fix application
    - `ValidateFixes(original, fixed string) (FixValidation, error)` - Fix validation
    - `CreateFixPlan(issues []ValidationIssue) (FixPlan, error)` - Fix plan creation
    - `CalculateFixImpact(fixes []Fix, projectPath string) (ImpactAnalysis, error)` - Fix impact analysis
    - `RollbackFixes(projectPath string, backupPath string) error` - Fix rollback
    - `GenerateFixReport(result FixResult) (FixReport, error)` - Fix report generation

#### **`pkg/publisher/`** - Publishing System

- **`client.go`** - API Client Implementation
  - **Function**: Cynk API client for publishing operations
  - **Core Methods**:
    - `NewClient(config ClientConfig) (Client, error)` - Client creation
    - `Authenticate(credentials AuthCredentials) (AuthResult, error)` - User authentication
    - `RefreshToken(refreshToken string) (AuthResult, error)` - Token refresh
    - `ValidateConnection() (ConnectionValidation, error)` - Connection validation
    - `GetServerInfo() (ServerInfo, error)` - Server information retrieval
    - `CheckCompatibility(clientVersion, serverVersion string) (CompatibilityResult, error)` - Compatibility checking
    - `Close() error` - Client cleanup

- **`uploader.go`** - Package Upload Engine
  - **Function**: Secure package upload with progress tracking
  - **Core Methods**:
    - `UploadPackage(packagePath string, config UploadConfig) (UploadResult, error)` - Package upload
    - `PrepareUpload(packagePath string) (UploadPreparation, error)` - Upload preparation
    - `CreateUploadSession(config UploadConfig) (UploadSession, error)` - Upload session creation
    - `UploadChunk(session UploadSession, chunk Chunk) (ChunkResult, error)` - Chunk upload
    - `FinalizeUpload(session UploadSession) (UploadResult, error)` - Upload finalization
    - `ValidateUploadResult(result UploadResult) (ValidationResult, error)` - Upload result validation
    - `CleanupUpload(session UploadSession) error` - Upload cleanup

- **`progress_tracker.go`** - Upload Progress Tracking
  - **Function**: Real-time upload progress monitoring
  - **Core Methods**:
    - `NewProgressTracker(total int64, config ProgressConfig) (ProgressTracker, error)` - Tracker creation
    - `UpdateProgress(current int64) error` - Progress update
    - `CalculateETA() (time.Duration, error)` - ETA calculation
    - `GetProgressStats() (ProgressStats, error)` - Progress statistics
    - `FormatProgress() string` - Progress formatting
    - `HandleProgressEvents(events <-chan ProgressEvent) error` - Progress event handling
    - `Complete() error` - Progress completion

- **`auth.go`** - Authentication Management
  - **Function**: Authentication and token management
  - **Core Methods**:
    - `Login(credentials AuthCredentials) (AuthResult, error)` - User login
    - `Logout() error` - User logout
    - `ValidateToken(token string) (TokenValidation, error)` - Token validation
    - `RefreshAuth() (AuthResult, error)` - Authentication refresh
    - `StoreCredentials(credentials AuthCredentials) error` - Credential storage
    - `LoadStoredCredentials() (AuthCredentials, error)` - Credential loading
    - `ClearCredentials() error` - Credential clearance

- **`retry.go`** - Retry Logic Implementation
  - **Function**: Retry mechanisms for network operations
  - **Core Methods**:
    - `NewRetryPolicy(config RetryConfig) (RetryPolicy, error)` - Retry policy creation
    - `ShouldRetry(error) bool` - Retry decision
    - `CalculateBackoff(attempt int) time.Duration` - Backoff calculation
    - `ExecuteWithRetry(operation RetryableOperation) (interface{}, error)` - Operation execution with retry
    - `Reset() error` - Retry state reset
    - `GetRetryStats() (RetryStats, error)` - Retry statistics
    - `ValidateRetryConfig(config RetryConfig) (ValidationResult, error)` - Retry configuration validation

#### **`pkg/ui/`** - User Interface Components

- **`colors.go`** - Color System Management
  - **Function**: Color definitions and theme management
  - **Core Methods**:
    - `NewColorTheme(theme Theme) (ColorTheme, error)` - Theme creation
    - `DetectTerminalTheme() (Theme, error)` - Terminal theme detection
    - `Colorize(text string, color Color) string` - Text colorization
    - `ValidateColorSupport() (ColorSupport, error)` - Color support validation
    - `CreateGradient(start, end Color, steps int) ([]Color, error)` - Gradient creation
    - `CalculateContrast(color1, color2 Color) (float64, error)` - Contrast calculation
    - `GenerateAccessibleColors(base Color) ([]Color, error)` - Accessible color generation

- **`printer.go`** - Colored Output Printing
  - **Function**: Formatted colored output
  - **Core Methods**:
    - `NewPrinter(theme ColorTheme) (Printer, error)` - Printer creation
    - `Success(format string, args ...interface{})` - Success message printing
    - `Error(format string, args ...interface{})` - Error message printing
    - `Warning(format string, args ...interface{})` - Warning message printing
    - `Info(format string, args ...interface{})` - Information message printing
    - `Debug(format string, args ...interface{})` - Debug message printing
    - `PrintTable(headers []string, rows [][]string, config TableConfig) error` - Table printing
    - `PrintJSON(data interface{}, indent bool) error` - JSON printing

- **`spinner.go`** - Animated Spinners
  - **Function**: Animated progress indicators
  - **Core Methods**:
    - `NewSpinner(message string, frames []string) (Spinner, error)` - Spinner creation
    - `Start() error` - Spinner start
    - `Stop() error` - Spinner stop
    - `UpdateMessage(message string) error` - Message update
    - `SetSpeed(duration time.Duration) error` - Speed adjustment
    - `Pause() error` - Spinner pause
    - `Resume() error` - Spinner resume

- **`progress.go`** - Progress Bars
  - **Function**: Progress bar implementation
  - **Core Methods**:
    - `NewProgressBar(total int64, config ProgressBarConfig) (ProgressBar, error)` - Progress bar creation
    - `Increment(n int64) error` - Progress increment
    - `SetTotal(total int64) error` - Total setting
    - `Render() error` - Progress bar rendering
    - `Finish() error` - Progress completion
    - `GetPercentage() float64` - Percentage calculation
    - `FormatProgress() string` - Progress formatting

- **`table.go`** - Formatted Tables
  - **Function**: Table formatting and display
  - **Core Methods**:
    - `NewTable(headers []string, config TableConfig) (Table, error)` - Table creation
    - `AddRow(row []string) error` - Row addition
    - `Render() error` - Table rendering
    - `Sort(column int, ascending bool) error` - Table sorting
    - `Filter(predicate RowFilter) error` - Table filtering
    - `CalculateColumnWidths() ([]int, error)` - Column width calculation
    - `Export(format TableFormat) ([]byte, error)` - Table export

- **`prompt.go`** - Interactive Prompts
  - **Function**: User input prompts
  - **Core Methods**:
    - `TextPrompt(message string, defaultValue string) (string, error)` - Text input prompt
    - `SelectPrompt(message string, options []string) (int, error)` - Selection prompt
    - `ConfirmPrompt(message string, defaultValue bool) (bool, error)` - Confirmation prompt
    - `PasswordPrompt(message string) (string, error)` - Password input prompt
    - `MultiSelectPrompt(message string, options []string) ([]int, error)` - Multi-selection prompt
    - `ValidateInput(input string, rules ValidationRules) (ValidationResult, error)` - Input validation
    - `FormatPromptOptions(options []string) string` - Option formatting

- **`logger.go`** - Structured Logging
  - **Function**: Structured logging with colors
  - **Core Methods**:
    - `NewLogger(level LogLevel, theme ColorTheme) (Logger, error)` - Logger creation
    - `SetLevel(level LogLevel) error` - Log level setting
    - `Debug(message string, fields map[string]interface{})` - Debug logging
    - `Info(message string, fields map[string]interface{})` - Info logging
    - `Warn(message string, fields map[string]interface{})` - Warning logging
    - `Error(message string, fields map[string]interface{})` - Error logging
    - `WithFields(fields map[string]interface{}) Logger` - Contextual logging
    - `Flush() error` - Log flushing

#### **`pkg/utils/`** - Utility Functions

- **`fileutils.go`** - File System Utilities
  - **Function**: File system operations and utilities
  - **Core Methods**:
    - `CopyFile(src, dst string) error` - File copying
    - `MoveFile(src, dst string) error` - File moving
    - `DeleteFile(path string) error` - File deletion
    - `CreateDirectory(path string) error` - Directory creation
    - `CalculateFileHash(path string, algorithm HashAlgorithm) (string, error)` - File hash calculation
    - `GetFileSize(path string) (int64, error)` - File size retrieval
    - `ListFiles(directory string, pattern string) ([]string, error)` - File listing

- **`network.go`** - Network Utilities
  - **Function**: HTTP client and network operations
  - **Core Methods**:
    - `NewHTTPClient(config HTTPConfig) (HTTPClient, error)` - HTTP client creation
    - `DoRequest(req HTTPRequest) (HTTPResponse, error)` - HTTP request execution
    - `DownloadFile(url, outputPath string, progress ProgressTracker) error` - File download
    - `UploadFile(url, filePath string, progress ProgressTracker) error` - File upload
    - `ValidateURL(url string) (URLValidation, error)` - URL validation
    - `CheckConnectivity(endpoint string) (ConnectivityResult, error)` - Connectivity checking
    - `ParseURL(url string) (ParsedURL, error)` - URL parsing

- **`ziputils.go`** - Archive Utilities
  - **Function**: ZIP archive operations
  - **Core Methods**:
    - `CreateZipArchive(files []string, outputPath string) error` - ZIP archive creation
    - `ExtractZipArchive(archivePath, outputDir string) error` - ZIP archive extraction
    - `ListZipContents(archivePath string) ([]ZipEntry, error)` - ZIP content listing
    - `ValidateZipArchive(archivePath string) (ValidationResult, error)` - ZIP archive validation
    - `AddToZipArchive(archivePath string, files []string) error` - File addition to ZIP
    - `RemoveFromZipArchive(archivePath string, files []string) error` - File removal from ZIP
    - `RepairZipArchive(archivePath string) (RepairResult, error)` - ZIP archive repair

- **`hash.go`** - Hashing Utilities
  - **Function**: Hash calculation and verification
  - **Core Methods**:
    - `CalculateHash(data []byte, algorithm HashAlgorithm) ([]byte, error)` - Data hash calculation
    - `CalculateFileHash(path string, algorithm HashAlgorithm) ([]byte, error)` - File hash calculation
    - `VerifyHash(data []byte, expected []byte, algorithm HashAlgorithm) (bool, error)` - Hash verification
    - `VerifyFileHash(path string, expected []byte, algorithm HashAlgorithm) (bool, error)` - File hash verification
    - `GenerateRandomHash() ([]byte, error)` - Random hash generation
    - `CompareHashes(hash1, hash2 []byte) (bool, error)` - Hash comparison
    - `ValidateHashAlgorithm(algorithm HashAlgorithm) (bool, error)` - Hash algorithm validation

- **`platform.go`** - Platform Detection
  - **Function**: Platform-specific operations
  - **Core Methods**:
    - `DetectOS() (OSInfo, error)` - Operating system detection
    - `DetectArchitecture() (Architecture, error)` - Architecture detection
    - `GetHomeDir() (string, error)` - Home directory retrieval
    - `GetTempDir() (string, error)` - Temporary directory retrieval
    - `GetConfigDir() (string, error)` - Configuration directory retrieval
    - `CheckPermissions(path string) (PermissionCheck, error)` - Permission checking
    - `ValidatePlatformSupport() (PlatformSupport, error)` - Platform support validation

---

### **`types/`** - SHARED TYPE DEFINITIONS

#### **`cpgx.types.go`** - .cpgx Format Types
- **Contains**: All type definitions for .cpgx package format
- **Key Types**:
  - `CPGXPackage` - Complete package structure
  - `PackageFile` - Individual file metadata
  - `PackageMetadata` - Package metadata and statistics
  - `CompressionConfig` - Compression settings
  - `PackageValidation` - Validation result types
  - `SignatureEmbedding` - Signature embedding configuration

#### **`manifest.types.go`** - Manifest Schema Types
- **Contains**: Plugin manifest type definitions
- **Key Types**:
  - `PluginManifest` - Complete manifest structure
  - `Dependency` - Dependency declaration
  - `Permission` - Permission requirements
  - `CompatibilityRange` - Version compatibility
  - `PluginMetadata` - Plugin metadata
  - `ManifestValidation` - Validation result types

#### **`crypto.types.go`** - Cryptography Types
- **Contains**: Cryptographic operation type definitions
- **Key Types**:
  - `KeyPair` - Public/private key pair
  - `Signature` - Digital signature structure
  - `Certificate` - X.509 certificate
  - `EncryptionConfig` - Encryption settings
  - `KeyStorage` - Key storage configuration
  - `CryptoValidation` - Validation result types

#### **`template.types.go`** - Template System Types
- **Contains**: Template system type definitions
- **Key Types**:
  - `Template` - Complete template definition
  - `TemplateConfig` - Template configuration
  - `GenerationContext` - Generation context
  - `TemplateRegistry` - Template registry structure
  - `ScaffoldingResult` - Scaffolding operation results
  - `TemplateValidation` - Validation result types

#### **`validation.types.go`** - Validation Result Types
- **Contains**: Validation operation result types
- **Key Types**:
  - `ValidationResult` - Comprehensive validation results
  - `StructureValidation` - Structure validation results
  - `SecurityValidation` - Security validation results
  - `CompatibilityValidation` - Compatibility validation results
  - `FixProposal` - Automated fix proposals
  - `ValidationReport` - Detailed validation reports

#### **`publisher.types.go`** - Publishing API Types
- **Contains**: Publishing operation type definitions
- **Key Types**:
  - `UploadSession` - Upload session management
  - `AuthCredentials` - Authentication credentials
  - `PublishResult` - Publishing operation results
  - `ServerInfo` - Server information
  - `ProgressTracking` - Progress tracking configuration
  - `PublishValidation` - Validation result types

#### **`config.types.go`** - Configuration Types
- **Contains**: Configuration system type definitions
- **Key Types**:
  - `CLIConfig` - Main CLI configuration
  - `ColorThemeConfig` - Color theme settings
  - `NetworkConfig` - Network configuration
  - `SecurityConfig` - Security settings
  - `TemplateConfig` - Template system configuration
  - `ConfigValidation` - Validation result types

#### **`ui.types.go`** - UI Component Types
- **Contains**: User interface type definitions
- **Key Types**:
  - `ColorTheme` - Complete color theme definition
  - `ProgressConfig` - Progress display configuration
  - `TableConfig` - Table formatting settings
  - `PromptConfig` - Interactive prompt settings
  - `LoggingConfig` - Logging configuration
  - `UIValidation` - Validation result types

---

### **`templates/`** - BUILT-IN TEMPLATES

#### **`go-basic/`** - Basic Go Plugin Template
- **Contains**: Minimal Go plugin project structure
- **Files**:
  - `manifest.json` - Basic manifest with Go-specific fields
  - `src/main.go` - Go plugin entry point with interface implementation
  - `bin/` - Directory for compiled binaries
  - `README.md` - Go plugin development guide
  - `.gitignore` - Go-specific git ignore rules

#### **`go-advanced/`** - Advanced Go Plugin Template
- **Contains**: Comprehensive Go plugin with best practices
- **Files**:
  - `manifest.json` - Advanced manifest with dependencies
  - `src/` - Structured source code directory
  - `config/` - Configuration management
  - `tests/` - Testing framework
  - `docs/` - Documentation structure
  - `scripts/` - Build and deployment scripts

#### **`javascript-basic/`** - Basic JavaScript Plugin Template
- **Contains**: Simple JavaScript plugin structure
- **Files**:
  - `manifest.json` - JavaScript-specific manifest
  - `src/index.js` - Main JavaScript entry point
  - `assets/` - Static assets directory
  - `package.json` - npm package configuration
  - `README.md` - JavaScript plugin guide

#### **`typescript-basic/`** - Basic TypeScript Plugin Template
- **Contains**: TypeScript plugin with type definitions
- **Files**:
  - `manifest.json` - TypeScript-specific manifest
  - `src/index.ts` - TypeScript entry point
  - `types/` - Type definitions
  - `tsconfig.json` - TypeScript configuration
  - `package.json` - TypeScript dependencies

#### **`lua-script/`** - Lua Script Plugin Template
- **Contains**: Lua scripting plugin structure
- **Files**:
  - `manifest.json` - Lua-specific manifest
  - `src/main.lua` - Main Lua script
  - `libs/` - Lua library dependencies
  - `config.lua` - Configuration file
  - `README.md` - Lua plugin guide

#### **`yaml-workflow/`** - YAML Workflow Plugin Template
- **Contains**: YAML-based workflow plugin
- **Files**:
  - `manifest.json` - YAML workflow manifest
  - `workflow.yaml` - Main workflow definition
  - `actions/` - Custom actions directory
  - `templates/` - Template files
  - `README.md` - Workflow plugin guide

#### **`json-config/`** - JSON Configuration Plugin Template
- **Contains**: JSON-based configuration plugin
- **Files**:
  - `manifest.json` - JSON configuration manifest
  - `config.json` - Main configuration file
  - `schemas/` - JSON schema definitions
  - `presets/` - Configuration presets
  - `README.md` - Configuration plugin guide

#### **`custom-template.md`** - Template Creation Guide
- **Contains**: Documentation for creating custom templates
- **Sections**:
  - Template structure requirements
  - Variable substitution syntax
  - Template validation rules
  - Best practices for template design
  - Testing custom templates

---

### **`internal/`** - INTERNAL IMPLEMENTATION

#### **`internal/config/`** - Configuration Management

- **`manager.go`** - Configuration System Manager
  - **Function**: Configuration loading, saving, and management
  - **Core Methods**:
    - `LoadConfig() (CLIConfig, error)` - Configuration loading
    - `SaveConfig(config CLIConfig) error` - Configuration saving
    - `ValidateConfig(config CLIConfig) (ValidationResult, error)` - Configuration validation
    - `MergeConfig(base, overlay CLIConfig) (CLIConfig, error)` - Configuration merging
    - `ResetToDefaults() error` - Configuration reset
    - `BackupConfig() error` - Configuration backup
    - `RestoreConfig(backupPath string) error` - Configuration restoration

- **`defaults.go`** - Default Configuration Values
  - **Function**: Default configuration values and presets
  - **Core Methods**:
    - `GetDefaultConfig() CLIConfig` - Default configuration retrieval
    - `GetDefaultTheme() ColorTheme` - Default theme retrieval
    - `GetDefaultPaths() PathConfig` - Default path configuration
    - `GetDefaultNetworkConfig() NetworkConfig` - Default network settings
    - `GetDefaultSecurityConfig() SecurityConfig` - Default security settings
    - `ValidateDefaults() (ValidationResult, error)` - Default configuration validation
    - `UpdateDefaults(newDefaults CLIConfig) error` - Default configuration updates

- **`env.go`** - Environment Variable Support
  - **Function**: Environment variable integration
  - **Core Methods**:
    - `LoadFromEnv() (CLIConfig, error)` - Environment variable loading
    - `SetEnvVars(config CLIConfig) error` - Environment variable setting
    - `ValidateEnvVars() (ValidationResult, error)` - Environment variable validation
    - `GetEnvVarMapping() map[string]string` - Environment variable mapping
    - `ClearEnvVars() error` - Environment variable clearance
    - `ExportEnvVars(config CLIConfig) ([]string, error)` - Environment variable export

- **`paths.go`** - Configuration Path Management
  - **Function**: Configuration file path management
  - **Core Methods**:
    - `GetConfigPath() (string, error)` - Configuration path retrieval
    - `GetCachePath() (string, error)` - Cache path retrieval
    - `GetLogPath() (string, error)` - Log path retrieval
    - `GetTempPath() (string, error)` - Temporary path retrieval
    - `ValidatePaths() (PathValidation, error)` - Path validation
    - `CreatePaths() error` - Path creation
    - `CleanupPaths() error` - Path cleanup

#### **`internal/constants/`** - Internal Constants

- **`version.go`** - Version Information
  - **Contains**: CLI version constants and information
  - **Constants**:
    - `CLIVersion` - Current CLI version
    - `CPGXFormatVersion` - .cpgx format version
    - `ManifestSchemaVersion` - Manifest schema version
    - `MinimumCynkVersion` - Minimum cynk version requirement
    - `BuildTimestamp` - Build timestamp
    - `GitCommit` - Git commit hash
    - `BuildEnvironment` - Build environment information

- **`constraints.go`** - System Constraints
  - **Contains**: Size limits and system constraints
  - **Constants**:
    - `MaxPackageSize` - Maximum package size limit
    - `MaxFileSize` - Maximum individual file size
    - `MaxFileCount` - Maximum files per package
    - `MaxDependencies` - Maximum dependencies per plugin
    - `MemoryLimit` - Memory usage limit
    - `TimeoutLimits` - Various operation timeouts
    - `SecurityLimits` - Security-related constraints

- **`errors.go`** - Error Constants
  - **Contains**: Error codes and messages
  - **Constants**:
    - `ErrorCodes` - Standard error code definitions
    - `ErrorMessages` - User-friendly error messages
    - `ExitCodes` - Process exit code definitions
    - `RecoverySuggestions` - Error recovery suggestions
    - `ValidationErrors` - Validation error definitions
    - `NetworkErrors` - Network-related error definitions

---

## **COMMAND LINE FLAGS REFERENCE**

### **Global Flags**
- **`--verbose, -v`** - Enable verbose output with detailed logging
- **`--quiet, -q`** - Suppress all non-essential output
- **`--no-color`** - Disable colored output
- **`--theme`** - Set color theme (auto|light|dark|none)
- **`--config`** - Use alternative configuration file
- **`--log-level`** - Set logging level (debug|info|warn|error)
- **`--log-file`** - Write logs to specified file
- **`--version`** - Show version information
- **`--help, -h`** - Show help information

### **`init` Command Flags**
- **`--template, -t`** - Specify template to use
- **`--author`** - Set plugin author name
- **`--description`** - Set plugin description
- **`--output, -o`** - Output directory for new project
- **`--interactive, -i`** - Use interactive mode
- **`--skip-deps`** - Skip dependency installation
- **`--force`** - Overwrite existing directory

### **`pack` Command Flags**
- **`--output, -o`** - Output .cpgx file path
- **`--compression`** - Compression level (none|low|medium|high)
- **`--include-source`** - Include source code in package
- **`--exclude`** - Patterns to exclude from package
- **`--no-validation`** - Skip pre-packaging validation
- **`--manifest`** - Use alternative manifest file

### **`sign` Command Flags**
- **`--key, -k`** - Private key file for signing
- **`--algorithm`** - Signature algorithm (ed25519|rsa|ecdsa)
- **`--timestamp`** - Include timestamp in signature
- **`--certificate`** - Include X.509 certificate
- **`--generate-keys`** - Generate new key pair
- **`--key-size`** - Key size for generation (2048|4096)

### **`verify` Command Flags**
- **`--key, -k`** - Public key for verification
- **`--check-structure`** - Validate package structure only
- **`--check-manifest`** - Validate manifest only
- **`--check-signature`** - Validate signature only
- **`--strict`** - Enable strict validation mode
- **`--output`** - Write verification report to file

### **`publish` Command Flags**
- **`--api-key`** - API key for authentication
- **`--server`** - Cynk server URL
- **`--dry-run`** - Validate without uploading
- **`--wait`** - Wait for processing completion
- **`--timeout`** - Operation timeout duration
- **`--retry`** - Number of retry attempts

### **`validate` Command Flags**
- **`--fix`** - Automatically fix validation issues
- **`--check`** - Specific checks to run (all|structure|security|dependencies)
- **`--output`** - Write validation report to file
- **`--strict`** - Treat warnings as errors
- **`--exclude`** - Checks to exclude

### **`template` Command Flags**
- **`--list, -l`** - List available templates
- **`--preview`** - Preview template contents
- **`--create`** - Create new template from project
- **`--remove`** - Remove existing template
- **`--update`** - Update existing template

### **`manifest` Command Flags**
- **`--generate`** - Generate new manifest
- **`--validate`** - Validate existing manifest
- **`--bump`** - Bump version (major|minor|patch)
- **`--set-version`** - Set specific version
- **`--update-field`** - Update specific manifest field

### **`key` Command Flags**
- **`--generate`** - Generate new key pair
- **`--import`** - Import existing keys
- **`--export`** - Export public key
- **`--list`** - List managed keys
- **`--algorithm`** - Key algorithm for generation

### **`info` Command Flags**
- **`--manifest`** - Show manifest only
- **`--list-files`** - List package contents
- **`--size`** - Show size breakdown
- **`--verify`** - Verify package integrity
- **`--output`** - Write info to file

### **`extract` Command Flags**
- **`--output, -o`** - Extraction directory
- **`--files`** - Specific files to extract
- **`--flat`** - Extract to flat directory structure
- **`--overwrite`** - Overwrite existing files
- **`--dry-run`** - Show what would be extracted

### **`config` Command Flags**
- **`--set`** - Set configuration value
- **`--get`** - Get configuration value
- **`--list`** - List all configuration
- **`--reset`** - Reset to defaults
- **`--export`** - Export configuration
- **`--import`** - Import configuration

### **`login` Command Flags**
- **`--server`** - Cynk server URL
- **`--username`** - Username for login
- **`--token`** - Use token-based authentication
- **`--logout`** - Log out from current session
- **`--status`** - Check login status

### **`version` Command Flags**
- **`--check-update`** - Check for updates
- **`--verbose`** - Show detailed version information
- **`--json`** - Output in JSON format
