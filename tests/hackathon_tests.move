#[test_only]
module hackathon::recommendation_tests {
    // Imports
    use hackathon::recommendation::{
        Self, 
        UniversityCap, 
        IssuerAuthorization, 
        Recommendation,
        ProtocolConfig
    };
    use iota::test_scenario::{Self};
    use iota::clock::{Self};

    // Test Addresses
    const ADMIN: address = @0xAD;
    const PROF_A: address = @0xA;
    const PROF_B: address = @0xB;

    // ==========================================
    // TEST 1: Happy Path (Issue & Revoke)
    // ==========================================
    #[test]
    fun test_complete_flow() {
        // Setup Scenario & Clock
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1_000); // Set time to 1 sec

        // 1. INIT (Admin creates UniversityCap & ProtocolConfig)
        recommendation::init_for_testing(test_scenario::ctx(&mut scenario));

        // 2. ADMIN accredits PROF_A
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<UniversityCap>(&scenario);
            recommendation::accredit_professor(
                &cap,
                b"prof_a_hash", // Mock Hash
                PROF_A,
                test_scenario::ctx(&mut scenario)
            );
            test_scenario::return_to_sender(&scenario, cap);
        };

        // 3. PROF_A issues a Recommendation
        test_scenario::next_tx(&mut scenario, PROF_A);
        {
            // PROF_A must have received the Auth object
            let auth = test_scenario::take_from_sender<IssuerAuthorization>(&scenario);
            // ProtocolConfig is shared, so we take it from shared pool
            let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
            
            recommendation::issue_recommendation(
                &auth,
                &config,
                b"Alice Smith",
                b"passport_hash_123",
                b"content_ipfs_hash",
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            // Return objects to proper storage
            test_scenario::return_to_sender(&scenario, auth);
            test_scenario::return_shared(config);
        };

        // 4. PROF_A revokes their own Recommendation
        test_scenario::next_tx(&mut scenario, PROF_A);
        {
            let auth = test_scenario::take_from_sender<IssuerAuthorization>(&scenario);
            let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
            // Recommendation is also shared now
            let mut rec = test_scenario::take_shared<Recommendation>(&scenario);

            // Check it is active before
            assert!(recommendation::is_valid(&rec), 0);
            
            // Execute Revoke
            recommendation::revoke_recommendation(&auth, &config, &mut rec);
            
            // Check it is inactive after
            assert!(!recommendation::is_valid(&rec), 1);

            test_scenario::return_to_sender(&scenario, auth);
            test_scenario::return_shared(config);
            test_scenario::return_shared(rec);
        };

        // Cleanup
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    // ==========================================
    // TEST 2: Security Check (Unauthorized Revoke)
    // ==========================================
    #[test]
    #[expected_failure(abort_code = hackathon::recommendation::E_WRONG_ISSUER)]
    fun test_unauthorized_revocation() {
        let mut scenario = test_scenario::begin(ADMIN);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        
        // 1. Setup
        recommendation::init_for_testing(test_scenario::ctx(&mut scenario));

        // 2. Accredit both professors
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<UniversityCap>(&scenario);
            recommendation::accredit_professor(&cap, b"hash_a", PROF_A, test_scenario::ctx(&mut scenario));
            recommendation::accredit_professor(&cap, b"hash_b", PROF_B, test_scenario::ctx(&mut scenario));
            test_scenario::return_to_sender(&scenario, cap);
        };

        // 3. PROF_A issues
        test_scenario::next_tx(&mut scenario, PROF_A);
        {
            let auth = test_scenario::take_from_sender<IssuerAuthorization>(&scenario);
            let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
            recommendation::issue_recommendation(&auth, &config, b"Student", b"P", b"C", &clock, test_scenario::ctx(&mut scenario));
            test_scenario::return_to_sender(&scenario, auth);
            test_scenario::return_shared(config);
        };

        // 4. PROF_B tries to revoke (Should Fail)
        test_scenario::next_tx(&mut scenario, PROF_B);
        {
            let auth = test_scenario::take_from_sender<IssuerAuthorization>(&scenario);
            let config = test_scenario::take_shared<ProtocolConfig>(&scenario);
            let mut rec = test_scenario::take_shared<Recommendation>(&scenario);
            
            // This line should trigger E_WRONG_ISSUER because auth.id != rec.issuer_auth_id
            recommendation::revoke_recommendation(&auth, &config, &mut rec);

            test_scenario::return_to_sender(&scenario, auth);
            test_scenario::return_shared(config);
            test_scenario::return_shared(rec);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }
}