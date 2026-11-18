package br.com.academia;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import jakarta.persistence.EntityManagerFactory;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

class PaginationPerformanceTest extends IntegrationSupport {
  @Autowired JdbcTemplate jdbc;
  @Autowired EntityManagerFactory entityManagerFactory;

  @Test
  void paginatedSummariesFetchDistinctAssociationsInTwoStatements() throws Exception {
    String prefix = "Consulta" + UUID.randomUUID().toString().replace("-", "");
    for (int i = 0; i < 8; i++) {
      long plan =
          jdbc.queryForObject(
              "insert into plans(name,price,period_months,benefits) values (?,100,1,'Livre')"
                  + " returning id",
              Long.class,
              prefix + i);
      long student =
          jdbc.queryForObject(
              "insert into students(name,email,phone,birth_date,enrollment_date,plan_id) values"
                  + " (?,?,'11999999999','2000-01-01','2025-01-01',?) returning id",
              Long.class,
              prefix + i,
              prefix + i + "@example.test",
              plan);
      long teacher =
          jdbc.queryForObject(
              "insert into teachers(name,email,phone,specialties) values"
                  + " (?,?,'11999999999','Força') returning id",
              Long.class,
              prefix + i,
              "teacher" + prefix + i + "@example.test");
      jdbc.update(
          "insert into workouts(name,student_id,teacher_id,issued_on,notes) values"
              + " (?,?,?,'2026-01-01','')",
          prefix + i,
          student,
          teacher);
      jdbc.update(
          "insert into invoices(student_id,competence,due_date,amount,period_months) values"
              + " (?,'2026-01-01','2026-01-10',100,1)",
          student);
      jdbc.update(
          "insert into assessments(student_id,assessed_on,weight_kg,height_cm,notes) values"
              + " (?,'2026-01-01',80,180,'')",
          student);
    }
    var statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    statistics.setStatisticsEnabled(true);
    Map<String, Long> statements = new LinkedHashMap<>();
    try {
      for (String resource : new String[] {"students", "workouts", "invoices", "assessments"}) {
        statistics.clear();
        mvc.perform(
                get("/api/" + resource + "?size=4&q=" + prefix).with(user("admin").roles("ADMIN")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(8))
            .andExpect(jsonPath("$.content.length()").value(4));
        statements.put(resource, statistics.getPrepareStatementCount());
      }
    } finally {
      statistics.setStatisticsEnabled(false);
    }
    assertTrue(
        statements.values().stream().allMatch(count -> count <= 2),
        "Uma página deve usar uma consulta de dados e uma contagem: " + statements);
  }
}
