package br.com.academia.shared;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import java.util.*;
@RestControllerAdvice
public class ApiErrors {
 @ExceptionHandler(ApiException.class) ResponseEntity<ProblemDetail> business(ApiException e) {return problem(e.status,e.getMessage());}
 @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<ProblemDetail> validation(MethodArgumentNotValidException e) {
  ProblemDetail p=ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,"Revise os campos informados.");
  Map<String,String> fields=new LinkedHashMap<>();e.getBindingResult().getFieldErrors().forEach(f -> fields.putIfAbsent(f.getField(),f.getDefaultMessage()));p.setProperty("fields",fields);return ResponseEntity.badRequest().body(p);
 }
 @ExceptionHandler({HttpMessageNotReadableException.class,MethodArgumentTypeMismatchException.class,IllegalArgumentException.class}) ResponseEntity<ProblemDetail> bad(Exception e) {return problem(HttpStatus.BAD_REQUEST,"Dados inválidos. Confira os valores e formatos.");}
 @ExceptionHandler({DataIntegrityViolationException.class,ObjectOptimisticLockingFailureException.class,jakarta.persistence.OptimisticLockException.class}) ResponseEntity<ProblemDetail> conflict(Exception e) {return problem(HttpStatus.CONFLICT,"O registro já existe, possui vínculos ou foi alterado. Atualize os dados.");}
 private ResponseEntity<ProblemDetail> problem(HttpStatus status,String detail) {return ResponseEntity.status(status).body(ProblemDetail.forStatusAndDetail(status,detail));}
}
