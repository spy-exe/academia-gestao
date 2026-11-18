package br.com.academia.shared;
import org.springframework.data.domain.*;
import java.util.Set;
public final class Pages {
 private Pages() {}
 public static Pageable of(int page,int size,String sort,String direction,Set<String> allowed) {
  if(page<0 || size<1 || size>50 || !allowed.contains(sort) || !Set.of("asc","desc").contains(direction)) throw new IllegalArgumentException("Paginação inválida");
  return PageRequest.of(page,size,Sort.by(Sort.Direction.fromString(direction),sort).and(Sort.by("id")));
 }
}
