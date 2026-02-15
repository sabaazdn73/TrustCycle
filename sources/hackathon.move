module hackathon::recommendation {
    use iota::clock::{Self, Clock};
    use iota::event;
    

    // ================= Errors =================
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_ALREADY_REVOKED: u64 = 2;
    const E_WRONG_ISSUER: u64 = 3;
    const E_ISSUANCE_DISABLED: u64 = 4;
    const E_REVOCATION_DISABLED: u64 = 5;

    // ================= Roles =================

    /// Master authority for the University / Provider.
    public struct UniversityCap has key, store { id: UID }

    /// Capability to manage protocol configuration.
    public struct ConfigCap has key, store { id: UID }

    /// Professor authorization badge.
    public struct IssuerAuthorization has key, store {
        id: UID,
        issuer_email_hash: vector<u8>, 
        active: bool,
    }

    // ================= Config =================

    /// Shared configuration object.
    public struct ProtocolConfig has key, store {
        id: UID,
        issuance_enabled: bool,
        revocation_enabled: bool,
        protocol_version: u64,
    }

    // ================= Core Objects =================

    /// The actual Recommendation Letter.
    public struct Recommendation has key, store {
        id: UID,
        issuer_auth_id: ID,       
        subject_name: vector<u8>, 
        subject_ref_hash: vector<u8>, 
        content_hash: vector<u8>, 
        issued_at: u64,           
        active: bool,             
    }

    // ================= Events =================

    public struct RecommendationIssued has copy, drop {
        recommendation_id: ID,
        issuer_auth_id: ID,       
        subject_ref_hash: vector<u8>,
        issued_at: u64,
    }

    public struct RecommendationRevoked has copy, drop {
        recommendation_id: ID,
        revoked_by_auth_id: ID,
    }

    // ================= Initialization =================

    fun init(ctx: &mut TxContext) {
        transfer::transfer(UniversityCap { id: object::new(ctx) }, tx_context::sender(ctx));
        transfer::transfer(ConfigCap { id: object::new(ctx) }, tx_context::sender(ctx));

        let config = ProtocolConfig {
            id: object::new(ctx),
            issuance_enabled: true,
            revocation_enabled: true,
            protocol_version: 1,
        };
        transfer::share_object(config);
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }

    // ================= Admin Functions =================

    public entry fun accredit_professor(
        _: &UniversityCap,
        issuer_email_hash: vector<u8>,
        professor_address: address,
        ctx: &mut TxContext
    ) {
        let auth = IssuerAuthorization {
            id: object::new(ctx),
            issuer_email_hash,
            active: true,
        };
        transfer::transfer(auth, professor_address);
    }

    public entry fun update_config(
        _: &ConfigCap,
        config: &mut ProtocolConfig,
        issuance_enabled: bool,
        revocation_enabled: bool,
        new_version: u64,
    ) {
        config.issuance_enabled = issuance_enabled;
        config.revocation_enabled = revocation_enabled;
        config.protocol_version = new_version;
    }

    // ================= Professor Functions =================

    public entry fun issue_recommendation(
        auth: &IssuerAuthorization,
        config: &ProtocolConfig,
        subject_name: vector<u8>,
        subject_ref_hash: vector<u8>,
        content_hash: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(config.issuance_enabled, E_ISSUANCE_DISABLED);
        assert!(auth.active, E_NOT_AUTHORIZED);

        let timestamp = clock::timestamp_ms(clock);
        
        let rec = Recommendation {
            id: object::new(ctx),
            issuer_auth_id: object::id(auth),
            subject_name,
            subject_ref_hash,
            content_hash,
            issued_at: timestamp,
            active: true,
        };

        event::emit(RecommendationIssued {
            recommendation_id: object::id(&rec),
            issuer_auth_id: object::id(auth),
            subject_ref_hash,
            issued_at: timestamp,
        });

        transfer::share_object(rec);
    }

    public entry fun revoke_recommendation(
        auth: &IssuerAuthorization,
        config: &ProtocolConfig,
        rec: &mut Recommendation
    ) {
        assert!(config.revocation_enabled, E_REVOCATION_DISABLED);
        assert!(auth.active, E_NOT_AUTHORIZED);
        assert!(object::id(auth) == rec.issuer_auth_id, E_WRONG_ISSUER);
        assert!(rec.active, E_ALREADY_REVOKED);

        rec.active = false;

        event::emit(RecommendationRevoked {
            recommendation_id: object::id(rec),
            revoked_by_auth_id: object::id(auth),
        });
    }

    // ================= Views =================

    public fun is_valid(rec: &Recommendation): bool {
        rec.active
    }

    public fun protocol_version(config: &ProtocolConfig): u64 {
        config.protocol_version
    }
}