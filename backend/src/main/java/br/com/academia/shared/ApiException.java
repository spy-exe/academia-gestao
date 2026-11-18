package br.com.academia.shared;
import org.springframework.http.HttpStatus;
public class ApiException extends RuntimeException {
 public final HttpStatus status;
 public ApiException(HttpStatus status,String message) {super(message);this.status=status;}
 public static ApiException missing() {return new ApiException(HttpStatus.NOT_FOUND,"Registro não encontrado.");}
 public static ApiException conflict(String message) {return new ApiException(HttpStatus.CONFLICT,message);}
}
