package com.hprrims.security;

import com.hprrims.entity.Role;
import com.hprrims.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public record UserPrincipal(Long id, String username, String passwordHash, String fullName, Role role, boolean active)
        implements UserDetails {

    public static UserPrincipal from(User u) {
        return new UserPrincipal(u.getId(), u.getUsername(), u.getPasswordHash(), u.getFullName(), u.getRole(), u.isActive());
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }

    public boolean hasRole(Role r) {
        return role == r;
    }
}
