package br.com.academia.dashboard;
import br.com.academia.shared.ActivityService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
@RestController @RequestMapping("/api/dashboard")
public class DashboardController {
 private final JdbcTemplate jdbc;private final ActivityService activities;private final Clock clock;
 public DashboardController(JdbcTemplate jdbc,ActivityService activities,Clock clock){this.clock=clock;this.jdbc=jdbc;this.activities=activities;}
 @GetMapping @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
 public Map<String,Object> dashboard(){
  var today=LocalDate.now(clock);var start=today.withDayOfMonth(1);
  Map<String,Object> result=new LinkedHashMap<>();
  result.put("activeStudents",jdbc.queryForObject("select count(*) from students where active",Long.class));
  result.put("activeTeachers",jdbc.queryForObject("select count(*) from teachers where active",Long.class));
  result.put("availablePlans",jdbc.queryForObject("select count(*) from plans where active",Long.class));
  result.put("monthlyRevenue",jdbc.queryForObject("select coalesce(sum(amount),0) from invoices where paid_on>=? and paid_on<?",java.math.BigDecimal.class,start,start.plusMonths(1)));
  result.put("pendingAmount",jdbc.queryForObject("select coalesce(sum(amount),0) from invoices where paid_on is null",java.math.BigDecimal.class));
  result.put("pendingInvoices",jdbc.queryForObject("select count(*) from invoices where paid_on is null",Long.class));
  result.put("overdueInvoices",jdbc.queryForObject("select count(*) from invoices where paid_on is null and due_date<?",Long.class,today));
  result.put("overdueAmount",jdbc.queryForObject("select coalesce(sum(amount),0) from invoices where paid_on is null and due_date<?",java.math.BigDecimal.class,today));
  result.put("recentActivities",activities.recent());return result;
 }
}
