describe("Inspection and Alert E2E Flow", () => {
  beforeEach(() => {
    // Clear IndexedDB local state before each test
    cy.window().then((win) => {
      win.indexedDB.deleteDatabase("voiceassistant_offline");
    });
  });

  it("should create an inspection report and verify alert propagation", () => {
    // 1. Log in as technician
    cy.visit("/login");
    cy.get('input[name="email"]').type("tech@voxfield.com");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("include", "/technician");

    // 2. Intercept inspection creation API
    cy.intercept("POST", "/api/inspections/create", {
      statusCode: 201,
      body: {
        data: {
          inspection: {
            id: "insp-123",
            title: "Pump Overheating",
            severity: "CRITICAL",
          },
          alertCreated: true,
        },
      },
    }).as("createInspection");

    // 3. Trigger mock voice query that generates a critical inspection
    cy.intercept("POST", "/api/voice-query", {
      statusCode: 201,
      body: {
        data: {
          agentResponse: "I have recorded a critical inspection for PUMP-W-01.",
          transcriptId: "tx-insp-123",
          sessionId: "session-insp-123",
        },
      },
    }).as("queryCall");

    // Click mic and submit
    cy.intercept("POST", "/api/stt", {
      statusCode: 200,
      body: { text: "record critical inspection pump is leaking" },
    }).as("sttCall");

    cy.contains("Voice Assistant Ready").should("be.visible");
    cy.wait(500);
    cy.get('button[aria-label="Toggle Voice Assistant"]').click(); // Start
    cy.contains("Tap to stop recording").should("be.visible");
    cy.wait(500);
    cy.get('button[aria-label="Toggle Voice Assistant"]').click(); // Stop

    cy.wait("@sttCall");
    cy.wait("@queryCall");

    // 4. Verify user notification of the inspection
    cy.contains("recorded a critical inspection").should("be.visible");

    // 5. Log out and log in as supervisor to verify alerts list
    cy.get('button[aria-label="Sign out"]').click({ force: true });
    cy.visit("/login");
    cy.get('input[name="email"]').type("supervisor@voxfield.com");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("include", "/supervisor");

    // Verify supervisor dashboard components
    cy.contains("Critical Alerts").should("be.visible");
    cy.contains("Active Work Orders").should("be.visible");
  });
});
