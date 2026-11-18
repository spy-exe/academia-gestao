package br.com.academia;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import tools.jackson.databind.*;

class FinanceTrainingTest extends IntegrationSupport {
  private final ObjectMapper json = tools.jackson.databind.json.JsonMapper.builder().build();

  JsonNode create(String path, String body) throws Exception {
    return json.readTree(
        mvc.perform(
                post("/api/" + path)
                    .with(user("admin").roles("ADMIN"))
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  @Test
  void completeFinancialAndTrainingHistory() throws Exception {
    long p =
        create(
                "plans",
                "{\"name\":\"Plano"
                    + " histórico\",\"price\":159.90,\"periodMonths\":1,\"benefits\":\"Livre\",\"active\":true}")
            .get("id")
            .asLong();
    long s =
        create(
                "students",
                "{\"name\":\"Aluna"
                    + " Histórico\",\"email\":\"historico@example.test\",\"phone\":\"11988887777\",\"birthDate\":\"2000-01-01\",\"enrollmentDate\":\"2025-01-01\",\"planId\":"
                    + p
                    + ",\"active\":true}")
            .get("id")
            .asLong();
    String invoice =
        "{\"studentId\":" + s + ",\"competence\":\"2026-01\",\"dueDate\":\"2026-01-10\"}";
    var first = create("invoices", invoice);
    var second = create("invoices", invoice);
    assertEquals(first.get("id"), second.get("id"));
    assertEquals("OVERDUE", first.get("status").asText());
    mvc.perform(
            put("/api/plans/" + p)
                .with(user("admin").roles("ADMIN"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"name\":\"Plano"
                        + " histórico\",\"price\":199.90,\"periodMonths\":1,\"benefits\":\"Livre\",\"active\":true,\"version\":0}"))
        .andExpect(status().isOk());
    mvc.perform(get("/api/invoices/" + first.get("id")).with(user("admin").roles("ADMIN")))
        .andExpect(jsonPath("$.amount").value(159.90));
    mvc.perform(
            post("/api/invoices/" + first.get("id") + "/payment")
                .with(user("admin").roles("ADMIN"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"paidOn\":\"2026-01-11\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PAID"));
    long t =
        create(
                "teachers",
                "{\"name\":\"Professor"
                    + " Histórico\",\"email\":\"prof@example.test\",\"phone\":\"11977776666\",\"specialties\":\"Força\",\"registration\":\"TEST-123\",\"active\":true}")
            .get("id")
            .asLong();
    var workout =
        create(
            "workouts",
            "{\"name\":\"Ficha A\",\"studentId\":"
                + s
                + ",\"teacherId\":"
                + t
                + ",\"issuedOn\":\"2026-01-10\",\"notes\":\"Rotina\",\"exercises\":[{\"name\":\"Agachamento\",\"sets\":3,\"repetitions\":\"12\",\"loadKg\":20,\"restSeconds\":60,\"notes\":\"\"},{\"name\":\"Remada\",\"sets\":3,\"repetitions\":\"10\",\"loadKg\":15,\"restSeconds\":45,\"notes\":\"\"}]}");
    mvc.perform(get("/api/workouts/" + workout.get("id")).with(user("admin").roles("ADMIN")))
        .andExpect(jsonPath("$.exercises[1].name").value("Remada"));
    var assessment =
        create(
            "assessments",
            "{\"studentId\":"
                + s
                + ",\"assessedOn\":\"2026-01-12\",\"weightKg\":80,\"heightCm\":200,\"notes\":\"\"}");
    assertEquals(20.0, assessment.get("bmi").asDouble());
    mvc.perform(get("/api/assessments?studentId=" + s).with(user("admin").roles("ADMIN")))
        .andExpect(jsonPath("$.totalElements").value(1));
    mvc.perform(get("/api/dashboard").with(user("admin").roles("ADMIN")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.activeStudents").isNumber());
  }

  @Test
  void preventsOverlappingCoveragePeriods() throws Exception {
    long plan =
        create(
                "plans",
                "{\"name\":\"Trimestral"
                    + " concorrência\",\"price\":399,\"periodMonths\":3,\"benefits\":\"Acesso\",\"active\":true}")
            .get("id")
            .asLong();
    long student =
        create(
                "students",
                "{\"name\":\"Aluno"
                    + " cobertura\",\"email\":\"coverage@example.test\",\"phone\":\"11988887777\",\"birthDate\":\"2000-01-01\",\"enrollmentDate\":\"2025-01-01\",\"planId\":"
                    + plan
                    + ",\"active\":true}")
            .get("id")
            .asLong();
    create(
        "invoices",
        "{\"studentId\":" + student + ",\"competence\":\"2026-01\",\"dueDate\":\"2026-01-10\"}");
    mvc.perform(
            post("/api/invoices")
                .with(user("admin").roles("ADMIN"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"studentId\":"
                        + student
                        + ",\"competence\":\"2026-02\",\"dueDate\":\"2026-02-10\"}"))
        .andExpect(status().isConflict());
  }
}
