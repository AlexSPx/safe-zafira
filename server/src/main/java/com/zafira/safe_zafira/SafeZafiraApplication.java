package com.zafira.safe_zafira;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@ComponentScan(basePackages = "com.zafira")
@EnableJpaRepositories(basePackages = "com.zafira")
@EntityScan(basePackages = "com.zafira")
public class SafeZafiraApplication {

	public static void main(String[] args) {
		SpringApplication.run(SafeZafiraApplication.class, args);
	}
}
