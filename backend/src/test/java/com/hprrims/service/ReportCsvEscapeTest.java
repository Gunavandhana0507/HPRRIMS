package com.hprrims.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ReportCsvEscapeTest {

    @Test
    void neutralisesFormulaPrefixes() {
        assertEquals("'=HYPERLINK(1)", ReportService.escape("=HYPERLINK(1)"));
        assertEquals("'@SUM", ReportService.escape("@SUM"));
        assertEquals("'+cmd", ReportService.escape("+cmd"));
    }

    @Test
    void keepsNegativeNumbers() {
        assertEquals("-3.5", ReportService.escape("-3.5"));
        assertEquals("-2", ReportService.escape(-2));
    }

    @Test
    void quotesSeparatorsAndQuotes() {
        assertEquals("\"a,b\"", ReportService.escape("a,b"));
        assertEquals("\"say \"\"hi\"\"\"", ReportService.escape("say \"hi\""));
        assertEquals("", ReportService.escape(null));
    }
}
