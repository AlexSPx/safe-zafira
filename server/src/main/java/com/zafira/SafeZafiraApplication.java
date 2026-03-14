package com.zafira;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = "com.zafira")
public class SafeZafiraApplication {

	public static void main(String[] args) {
		SpringApplication.run(SafeZafiraApplication.class, args);
	}
}
