package com.hprrims.service;

final class Text {

    private Text() {
    }

    static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    static String like(String q) {
        String t = blankToNull(q);
        return t == null ? null : "%" + t.toLowerCase().replace("%", "").replace("_", "") + "%";
    }
}
