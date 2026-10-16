package com.hprrims.controller;

final class Paging {

    private Paging() {
    }

    static int page(int page) {
        return Math.max(0, page);
    }

    static int size(int size) {
        return Math.min(100, Math.max(1, size));
    }
}
