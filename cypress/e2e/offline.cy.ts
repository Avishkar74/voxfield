describe("Offline Mode & Synchronization", () => {
  beforeEach(() => {
    // Reset IndexedDB database
    cy.window().then((win) => {
      win.indexedDB.deleteDatabase("voiceassistant_offline");
    });
  });

  it("should queue voice queries offline and synchronize on reconnect", () => {
    // 1. Visit technician page
    cy.visit("/login");
    cy.get('input[name="email"]').type("tech@voxfield.com");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("include", "/technician");

    // 2. Simulate offline network state via Cypress goOffline
    cy.log("Simulating system going offline");
    cy.window().then((win) => {
      // Trigger browser offline event
      win.dispatchEvent(new win.Event("offline"));
    });

    // 3. Verify Offline Indicator shows "System Offline"
    cy.contains("System Offline").should("be.visible");

    // 4. Record a voice interaction while offline
    // The query should be queued in IndexedDB as PENDING_SYNC
    cy.intercept("POST", "/api/stt", {
      statusCode: 200,
      body: { text: "what is generator 1 status" },
    }).as("sttCall");

    cy.get("main button").click(); // Start
    cy.wait(500);
    cy.get("main button").click(); // Stop

    cy.wait("@sttCall");

    // 5. Verify local queue updates with pending indicator
    cy.contains("1 pending synchronization").should("be.visible");

    // 6. Go back online and verify sync endpoint is called
    cy.intercept("POST", "/api/health", {
      statusCode: 200,
      body: { status: "ok" },
    }).as("healthCheck");

    cy.intercept("POST", "/api/sync-offline-queue", {
      statusCode: 200,
      body: {
        data: { success: 1, failed: 0 },
      },
    }).as("syncQueue");

    cy.log("Simulating system going online");
    cy.window().then((win) => {
      win.dispatchEvent(new win.Event("online"));
    });

    // Health checks and sync trigger
    cy.wait("@healthCheck");
    cy.wait("@syncQueue");

    // Verify indicator goes back to System Online and pending count is cleared
    cy.contains("System Online").should("be.visible");
    cy.contains("pending synchronization").should("not.exist");
  });
});
