package br.com.academia.shared;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import java.util.*;
@Service
public class ActivityService {
 private final JdbcTemplate jdbc;
 public ActivityService(JdbcTemplate jdbc) {this.jdbc=jdbc;}
 public void record(String description) {
  var auth=SecurityContextHolder.getContext().getAuthentication();
  jdbc.update("insert into activities(actor,description) values (?,?)",auth==null?"sistema":auth.getName(),description);
 }
 public List<Map<String,Object>> recent() {return jdbc.queryForList("select id,actor,description,occurred_at as \"occurredAt\" from activities order by id desc limit 8");}
}
