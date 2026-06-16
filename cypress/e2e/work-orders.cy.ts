describe("Work Order E2E Flow", () => {
  beforeEach(() => {
    // Clear IndexedDB local state before each test
    cy.window().then((win) => {
      win.indexedDB.deleteDatabase("voiceassistant_offline");
    });
  });

  it("should display technician work orders and update status", () => {
    // 1. Sign in as Technician
    cy.visit("/login");
    cy.get('input[name="email"]').type("tech@voxfield.com");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("include", "/technician");

    // 2. Intercept update work order API
    cy.intercept("PATCH", "/api/work-orders/*", {
      statusCode: 200,
      body: {
        data: {
          workOrder: {
            id: "wo-123",
            work_order_number: "WO-2023-001",
            title: "Replace Pump Mechanical Seal",
            status: "CLOSED",
            priority: "CRITICAL",
          },
        },
      },
    }).as("updateWorkOrder");

    // 3. Verify work order list is present
    cy.contains("My Work Orders").should("be.visible");
    cy.contains("WO-2023-001").should("be.visible");

    // 4. Simulate status transitions using voice command
    cy.intercept("POST", "/api/stt", {
      statusCode: 200,
      body: { text: "close work order WO-2023-001" },
    }).as("sttCall");

    cy.intercept("POST", "/api/voice-query", {
      statusCode: 201,
      body: {
        data: {
          agentResponse: "Work order WO-2023-001 has been successfully closed.",
          transcriptId: "tx-wo-123",
          sessionId: "session-wo-123",
        },
      },
    }).as("queryCall");

    cy.contains("Voice Assistant Ready").should("be.visible");
    cy.wait(500);
    cy.get('button[aria-label="Toggle Voice Assistant"]').click(); // Start
    cy.contains("Tap to stop recording").should("be.visible");
    cy.get('button[aria-label="Toggle Voice Assistant"]').click(); // Stop

    cy.wait("@sttCall");
    cy.wait("@queryCall");

    // Verify response
    cy.contains("WO-2023-001 has been successfully closed").should("be.visible");
  });
});
