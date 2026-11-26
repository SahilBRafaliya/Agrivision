import { useState, useEffect } from 'react';
import { FileText, Download, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { aiAPI, ndviHistoryAPI, feedbackAPI } from '@/services/api';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  navy:       '#0f2d4a',
  navyLight:  '#1a3f61',
  green:      '#059669',
  greenLight: '#ecfdf5',
  greenMid:   '#d1fae5',
  red:        '#dc2626',
  redLight:   '#fef2f2',
  amber:      '#d97706',
  amberLight: '#fffbeb',
  blue:       '#2563eb',
  blueLight:  '#eff6ff',
  white:      '#ffffff',
  gray50:     '#f9fafb',
  gray100:    '#f3f4f6',
  gray200:    '#e5e7eb',
  gray400:    '#9ca3af',
  gray500:    '#6b7280',
  gray700:    '#374151',
  gray900:    '#111827',
};

// ─── PDF StyleSheet ───────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page:           { fontFamily: 'Helvetica', backgroundColor: C.white, paddingBottom: 60 },

  // ── Cover band ──
  coverBand:      { backgroundColor: C.navy, padding: '36 40 28 40' },
  coverTag:       { fontSize: 9, color: C.green, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, fontFamily: 'Helvetica-Bold' },
  coverTitle:     { fontSize: 26, fontFamily: 'Helvetica-Bold', color: C.white, marginBottom: 6 },
  coverSub:       { fontSize: 11, color: '#94a3b8', marginBottom: 20 },
  coverMeta:      { flexDirection: 'row', gap: 24 },
  coverMetaItem:  { marginRight: 24 },
  coverMetaLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  coverMetaValue: { fontSize: 10, color: C.white, fontFamily: 'Helvetica-Bold' },

  // ── Body padding ──
  body:           { paddingHorizontal: 40, paddingTop: 28 },

  // ── Section ──
  section:        { marginBottom: 24 },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 6, borderBottom: `1.5 solid ${C.gray200}` },
  sectionNum:     { fontSize: 10, color: C.green, fontFamily: 'Helvetica-Bold', marginRight: 8, letterSpacing: 1 },
  sectionTitle:   { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.gray900 },

  // ── Executive summary cards ──
  execGrid:       { flexDirection: 'row', marginBottom: 6 },
  execCard:       { flex: 1, marginRight: 8, borderRadius: 6, padding: '12 10', alignItems: 'center' },
  execCardLast:   { marginRight: 0 },
  execVal:        { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.white, marginBottom: 3 },
  execLbl:        { fontSize: 8, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 1 },

  // ── Status badge ──
  badge:          { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText:      { fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },

  // ── Two-column detail row ──
  detailRow:      { flexDirection: 'row', marginBottom: 1 },
  detailCell:     { flex: 1, paddingVertical: 7, paddingHorizontal: 10, borderBottom: `1 solid ${C.gray100}` },
  detailCellAlt:  { flex: 1, paddingVertical: 7, paddingHorizontal: 10, borderBottom: `1 solid ${C.gray100}`, backgroundColor: C.gray50 },
  detailLabel:    { fontSize: 8, color: C.gray500, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  detailValue:    { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.gray900 },
  detailValueSm:  { fontSize: 10, color: C.gray700 },

  // ── Table ──
  tableHeader:    { flexDirection: 'row', backgroundColor: C.navy, borderRadius: '4 4 0 0', paddingVertical: 7, paddingHorizontal: 10 },
  tableHeaderTxt: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.white, textTransform: 'uppercase', letterSpacing: 0.8 },
  tableRow:       { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 10, borderBottom: `1 solid ${C.gray100}` },
  tableRowAlt:    { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 10, borderBottom: `1 solid ${C.gray100}`, backgroundColor: C.gray50 },
  tableCell:      { fontSize: 9, color: C.gray700 },
  tableCellBold:  { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.gray900 },

  // ── Alert / feedback boxes ──
  alertBox:       { backgroundColor: C.redLight, borderLeft: `3 solid ${C.red}`, borderRadius: '0 4 4 0', padding: '8 10', marginBottom: 6 },
  alertTitle:     { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#991b1b', marginBottom: 2 },
  alertDesc:      { fontSize: 9, color: '#7f1d1d' },
  fbCorrect:      { backgroundColor: C.greenLight, borderLeft: `3 solid ${C.green}`, borderRadius: '0 4 4 0', padding: '7 10', marginBottom: 5 },
  fbIncorrect:    { backgroundColor: C.blueLight, borderLeft: `3 solid ${C.blue}`, borderRadius: '0 4 4 0', padding: '7 10', marginBottom: 5 },
  fbText:         { fontSize: 9, color: C.gray700 },
  fbMeta:         { fontSize: 8, color: C.gray400, marginTop: 2 },

  // ── Recommendations ──
  recBox:         { backgroundColor: C.greenLight, borderRadius: 6, padding: '12 14', marginBottom: 8 },
  recTitle:       { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.navy, marginBottom: 6 },
  recItem:        { flexDirection: 'row', marginBottom: 5 },
  recDot:         { fontSize: 9, color: C.green, marginRight: 6, fontFamily: 'Helvetica-Bold' },
  recText:        { fontSize: 9, color: C.gray700, flex: 1, lineHeight: 1.5 },

  // ── Divider ──
  divider:        { borderBottom: `1 solid ${C.gray200}`, marginBottom: 20 },

  // ── Footer ──
  footer:         { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.navy, paddingHorizontal: 40, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft:     { fontSize: 7.5, color: '#64748b' },
  footerCenter:   { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#94a3b8' },
  footerRight:    { fontSize: 7.5, color: '#64748b' },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function healthStatus(score: number): { label: string; bg: string; fg: string } {
  if (score >= 80) return { label: 'EXCELLENT',      bg: C.greenLight, fg: C.green };
  if (score >= 60) return { label: 'GOOD',           bg: '#fefce8',    fg: '#854d0e' };
  if (score >= 40) return { label: 'NEEDS ATTENTION',bg: C.amberLight, fg: C.amber  };
  return              { label: 'CRITICAL',           bg: C.redLight,   fg: C.red    };
}

function severityColor(sev: string): string {
  if (sev === 'high')   return C.red;
  if (sev === 'medium') return C.amber;
  return C.blue;
}

// ─── PDF Document ─────────────────────────────────────────────────────────────
const FarmPDF = ({ data }: { data: ReportData }) => {
  const { farm, analysis, farmAlerts, feedback, analytics, ndviHistory, period, generatedAt, reportId } = data;
  const status = healthStatus(analysis.health_score);
  const correctFb = feedback.filter(f => f.correct);
  const incorrectFb = feedback.filter(f => !f.correct);
  const labeledFb = feedback.filter(f => !f.correct && f.actualCropType);
  const fbAccuracy = feedback.length > 0 ? Math.round((correctFb.length / feedback.length) * 100) : (analytics?.model_accuracy ?? 0);

  return (
    <Document title={`AgriVision Report — ${farm.name}`} author="AgriVision AI Platform" subject="Agricultural Intelligence Report">
      <Page size="A4" style={S.page}>

        {/* ── Cover band ── */}
        <View style={S.coverBand}>
          <Text style={S.coverTag}>AgriVision AI Platform  •  Crop Intelligence Report</Text>
          <Text style={S.coverTitle}>{farm.name}</Text>
          <Text style={S.coverSub}>Satellite-Assisted Farm Analysis  |  Reporting Period: Last {period} Days</Text>
          <View style={S.coverMeta}>
            {[
              ['Generated',   new Date(generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
              ['Report ID',   reportId],
              ['Coordinates', `${farm.latitude.toFixed(4)} N, ${farm.longitude.toFixed(4)} E`],
              ['Crop',        farm.cropType],
            ].map(([lbl, val]) => (
              <View key={lbl} style={S.coverMetaItem}>
                <Text style={S.coverMetaLabel}>{lbl}</Text>
                <Text style={S.coverMetaValue}>{val}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Body ── */}
        <View style={S.body}>

          {/* 1. Executive Summary */}
          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionNum}>01</Text>
              <Text style={S.sectionTitle}>Executive Summary</Text>
            </View>
            <View style={S.execGrid}>
              {[
                { val: `${Math.round(analysis.health_score)}%`, lbl: 'Health Score',    bg: C.green    },
                { val: analysis.ndvi.toFixed(3),                lbl: 'NDVI Index',      bg: C.navyLight },
                { val: `${analysis.yield_prediction.toFixed(1)}`, lbl: 'Yield (t/ha)', bg: '#7c3aed'  },
                { val: `${fbAccuracy}%`,                        lbl: 'Model Accuracy',  bg: C.amber    },
              ].map((m, i) => (
                <View key={i} style={[S.execCard, i === 3 ? S.execCardLast : {}, { backgroundColor: m.bg }]}>
                  <Text style={S.execVal}>{m.val}</Text>
                  <Text style={S.execLbl}>{m.lbl}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 8 }}>
              <Text style={{ fontSize: 9, color: C.gray500, marginRight: 8 }}>Overall Status:</Text>
              <View style={[S.badge, { backgroundColor: status.bg }]}>
                <Text style={[S.badgeText, { color: status.fg }]}>{status.label}</Text>
              </View>
              {farmAlerts.length > 0 && (
                <View style={[S.badge, { backgroundColor: C.redLight, marginLeft: 8 }]}>
                  <Text style={[S.badgeText, { color: C.red }]}>{farmAlerts.length} ACTIVE ALERT{farmAlerts.length > 1 ? 'S' : ''}</Text>
                </View>
              )}
            </View>
          </View>

          {/* 2. Farm Information */}
          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionNum}>02</Text>
              <Text style={S.sectionTitle}>Farm Information</Text>
            </View>
            <View style={{ borderRadius: 6, overflow: 'hidden', border: `1 solid ${C.gray200}` }}>
              {[
                ['Farm Name', farm.name,                                'Farm Size',   `${farm.size} acres`],
                ['Crop Type', farm.cropType,                            'Registered',  new Date(farm.createdAt).toLocaleDateString('en-IN')],
                ['Latitude',  `${farm.latitude.toFixed(6)} N`,          'Longitude',   `${farm.longitude.toFixed(6)} E`],
              ].map(([l1, v1, l2, v2], i) => (
                <View key={i} style={i % 2 === 0 ? S.detailRow : S.detailRow}>
                  <View style={i % 2 === 0 ? S.detailCell : S.detailCellAlt}>
                    <Text style={S.detailLabel}>{l1}</Text>
                    <Text style={S.detailValue}>{v1}</Text>
                  </View>
                  <View style={i % 2 === 0 ? S.detailCell : S.detailCellAlt}>
                    <Text style={S.detailLabel}>{l2}</Text>
                    <Text style={S.detailValue}>{v2}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 3. AI Analysis */}
          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionNum}>03</Text>
              <Text style={S.sectionTitle}>AI Analysis Results</Text>
            </View>
            <View style={{ borderRadius: 6, overflow: 'hidden', border: `1 solid ${C.gray200}` }}>
              <View style={S.tableHeader}>
                {['Indicator', 'Value', 'Interpretation', 'Status'].map((h, i) => (
                  <Text key={i} style={[S.tableHeaderTxt, { flex: [2, 1, 3, 2][i] }]}>{h}</Text>
                ))}
              </View>
              {[
                {
                  ind: 'Crop Type',
                  val: analysis.crop_type,
                  interp: `AI-classified from satellite bands`,
                  status: { label: 'CLASSIFIED', bg: C.blueLight, fg: C.blue },
                },
                {
                  ind: 'Health Score',
                  val: `${Math.round(analysis.health_score)}%`,
                  interp: analysis.health_score >= 70 ? 'Vegetation in healthy condition' : 'Below optimal threshold',
                  status: healthStatus(analysis.health_score),
                },
                {
                  ind: 'NDVI',
                  val: analysis.ndvi.toFixed(4),
                  interp: analysis.ndvi >= 0.6 ? 'Dense healthy canopy cover' : analysis.ndvi >= 0.4 ? 'Moderate vegetation density' : 'Sparse or stressed vegetation',
                  status: analysis.ndvi >= 0.6 ? { label: 'HEALTHY', bg: C.greenLight, fg: C.green } : analysis.ndvi >= 0.4 ? { label: 'MODERATE', bg: '#fefce8', fg: '#854d0e' } : { label: 'LOW', bg: C.redLight, fg: C.red },
                },
                {
                  ind: 'NDWI',
                  val: analysis.ndwi.toFixed(4),
                  interp: analysis.ndwi >= 0 ? 'Adequate moisture levels' : 'Potential water stress',
                  status: analysis.ndwi >= 0 ? { label: 'ADEQUATE', bg: C.blueLight, fg: C.blue } : { label: 'WATER STRESS', bg: C.amberLight, fg: C.amber },
                },
                {
                  ind: 'Yield Estimate',
                  val: `${analysis.yield_prediction.toFixed(2)} t/ha`,
                  interp: 'Based on NDVI + crop classification',
                  status: { label: 'PROJECTED', bg: '#f5f3ff', fg: '#7c3aed' },
                },
              ].map((r, i) => (
                <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                  <Text style={[S.tableCellBold, { flex: 2 }]}>{r.ind}</Text>
                  <Text style={[S.tableCellBold, { flex: 1, color: C.navy }]}>{r.val}</Text>
                  <Text style={[S.tableCell,     { flex: 3 }]}>{r.interp}</Text>
                  <View style={{ flex: 2 }}>
                    <View style={[S.badge, { backgroundColor: r.status.bg }]}>
                      <Text style={[S.badgeText, { color: r.status.fg }]}>{r.status.label}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 4. NDVI History (if available) */}
          {ndviHistory.length > 0 && (
            <View style={S.section}>
              <View style={S.sectionHeader}>
                <Text style={S.sectionNum}>04</Text>
                <Text style={S.sectionTitle}>Vegetation Index History (Last {Math.min(ndviHistory.length, 8)} Records)</Text>
              </View>
              <View style={{ borderRadius: 6, overflow: 'hidden', border: `1 solid ${C.gray200}` }}>
                <View style={S.tableHeader}>
                  {['Date', 'NDVI Mean', 'NDWI Mean', 'EVI Mean', 'Health Score', 'Yield (t/ha)'].map((h, i) => (
                    <Text key={i} style={[S.tableHeaderTxt, { flex: 1 }]}>{h}</Text>
                  ))}
                </View>
                {ndviHistory.slice(0, 8).map((r, i) => (
                  <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                    <Text style={[S.tableCell, { flex: 1 }]}>{r.date}</Text>
                    <Text style={[S.tableCellBold, { flex: 1 }]}>{r.ndvi_mean.toFixed(3)}</Text>
                    <Text style={[S.tableCell, { flex: 1 }]}>{r.ndwi_mean != null ? r.ndwi_mean.toFixed(3) : '—'}</Text>
                    <Text style={[S.tableCell, { flex: 1 }]}>{r.evi_mean  != null ? r.evi_mean.toFixed(3)  : '—'}</Text>
                    <Text style={[S.tableCell, { flex: 1 }]}>{r.health_score != null ? `${Math.round(r.health_score)}%` : '—'}</Text>
                    <Text style={[S.tableCell, { flex: 1 }]}>{r.yield_prediction != null ? r.yield_prediction.toFixed(2) : '—'}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 5. Active Alerts */}
          {farmAlerts.length > 0 && (
            <View style={S.section}>
              <View style={S.sectionHeader}>
                <Text style={S.sectionNum}>{ndviHistory.length > 0 ? '05' : '04'}</Text>
                <Text style={S.sectionTitle}>Active Alerts  ({farmAlerts.length})</Text>
              </View>
              {farmAlerts.map((a, i) => (
                <View key={i} style={[S.alertBox, { borderLeftColor: severityColor(a.severity) }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={[S.alertTitle, { color: severityColor(a.severity) === C.red ? '#991b1b' : C.amber }]}>{a.title}</Text>
                    <View style={[S.badge, { backgroundColor: severityColor(a.severity) === C.red ? C.redLight : C.amberLight }]}>
                      <Text style={[S.badgeText, { color: severityColor(a.severity) }]}>{a.severity.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={S.alertDesc}>{a.description}</Text>
                  <Text style={{ fontSize: 8, color: C.gray400, marginTop: 3 }}>
                    {new Date(a.timestamp).toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 6. Farmer Feedback & HIL Summary */}
          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionNum}>{ndviHistory.length > 0 ? (farmAlerts.length > 0 ? '06' : '05') : (farmAlerts.length > 0 ? '05' : '04')}</Text>
              <Text style={S.sectionTitle}>Farmer Feedback & Human-in-the-Loop Summary</Text>
            </View>

            {/* Summary row */}
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              {[
                { val: feedback.length,       lbl: 'Total Submissions', bg: C.gray100, fg: C.gray900 },
                { val: correctFb.length,      lbl: 'Confirmed Correct', bg: C.greenLight, fg: C.green },
                { val: incorrectFb.length,    lbl: 'Corrections Filed',  bg: C.blueLight, fg: C.blue  },
                { val: labeledFb.length,      lbl: 'Ground-Truth Labels',bg: '#f5f3ff',   fg: '#7c3aed' },
              ].map((m, i) => (
                <View key={i} style={[{
                  flex: 1, marginRight: i < 3 ? 8 : 0, borderRadius: 6,
                  backgroundColor: m.bg, padding: '10 8', alignItems: 'center',
                }]}>
                  <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: m.fg, marginBottom: 2 }}>{m.val}</Text>
                  <Text style={{ fontSize: 7.5, color: C.gray500, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' }}>{m.lbl}</Text>
                </View>
              ))}
            </View>

            {/* Recent feedback list */}
            {feedback.length > 0 && (
              <>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.gray500, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                  Recent Submissions
                </Text>
                {feedback.slice(0, 6).map((f, i) => (
                  <View key={i} style={f.correct ? S.fbCorrect : S.fbIncorrect}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[S.fbText, { fontFamily: 'Helvetica-Bold', color: f.correct ? C.green : C.blue }]}>
                        {f.correct ? 'PREDICTION CONFIRMED' : `CORRECTION FILED${f.reason ? ` — ${f.reason}` : ''}`}
                      </Text>
                      <Text style={{ fontSize: 8, color: C.gray400 }}>{new Date(f.timestamp).toLocaleDateString('en-IN')}</Text>
                    </View>
                    {!f.correct && f.actualCropType && (
                      <Text style={[S.fbMeta, { color: '#1d4ed8' }]}>Ground truth crop: {f.actualCropType}{f.actualYieldObserved ? `  |  Observed yield: ${f.actualYieldObserved} t/ha` : ''}</Text>
                    )}
                    {f.groundNotes && (
                      <Text style={[S.fbMeta, { fontStyle: 'italic' }]}>"{f.groundNotes}"</Text>
                    )}
                  </View>
                ))}
              </>
            )}

            {feedback.length === 0 && (
              <View style={{ padding: '14 12', backgroundColor: C.gray50, borderRadius: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: C.gray400 }}>No farmer feedback recorded for this farm in the selected period.</Text>
              </View>
            )}
          </View>

          {/* 7. Recommendations */}
          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionNum}>{String(7 - (ndviHistory.length === 0 ? 1 : 0) - (farmAlerts.length === 0 ? 1 : 0)).padStart(2, '0')}</Text>
              <Text style={S.sectionTitle}>Recommendations & Action Plan</Text>
            </View>
            <View style={S.recBox}>
              <Text style={S.recTitle}>Agronomic Advisory</Text>
              {[
                analysis.health_score < 40
                  ? 'URGENT: Crop health is critical. Conduct immediate field inspection for disease, pest infestation, or severe water deficit.'
                  : analysis.health_score < 70
                  ? 'Crop health is below optimal. Evaluate irrigation scheduling and consider foliar nutrient application.'
                  : 'Crop health is within the optimal range. Maintain current management practices.',
                analysis.ndvi < 0.4
                  ? 'NDVI is critically low — possible crop failure or field abandonment. Verify on ground before intervention.'
                  : analysis.ndvi < 0.55
                  ? 'NDVI indicates moderate stress. Consider soil moisture monitoring and supplemental irrigation.'
                  : 'NDVI indicates a healthy, dense canopy. Continue monitoring weekly.',
                analysis.ndwi < 0
                  ? 'NDWI is negative — water content in vegetation is low. Irrigation is recommended within the next 48 hours.'
                  : 'NDWI is positive — adequate water content detected in the crop canopy.',
                farmAlerts.length > 0
                  ? `Resolve ${farmAlerts.length} active alert(s) promptly. High-severity alerts require immediate on-ground response.`
                  : 'No active alerts — continue routine satellite monitoring at 5-day intervals.',
                labeledFb.length > 0
                  ? `${labeledFb.length} ground-truth label(s) are ready for HIL model retraining. Trigger retraining to improve prediction accuracy.`
                  : 'Submit corrections with actual crop type via the Farmer Portal to enable Human-in-the-Loop model improvement.',
                `Predicted yield of ${analysis.yield_prediction.toFixed(2)} t/ha is based on current NDVI. Actual yield may vary with harvest management.`,
              ].map((rec, i) => (
                <View key={i} style={S.recItem}>
                  <Text style={S.recDot}>{i + 1}.</Text>
                  <Text style={S.recText}>{rec}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Disclaimer */}
          <View style={{ paddingTop: 8, borderTop: `1 solid ${C.gray200}` }}>
            <Text style={{ fontSize: 7.5, color: C.gray400, lineHeight: 1.5 }}>
              DISCLAIMER: This report is generated from Sentinel-2 satellite imagery processed by the AgriVision AI platform.
              Predictions are indicative only and should be validated with ground-truth observations before taking management
              decisions. Model accuracy improves with ongoing Human-in-the-Loop feedback.
            </Text>
          </View>

        </View>

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text style={S.footerLeft}>AgriVision AI Platform  |  Confidential</Text>
          <Text style={S.footerCenter}>{farm.name}  —  Farm Intelligence Report</Text>
          <Text style={S.footerRight}>Generated {new Date(generatedAt).toLocaleString('en-IN')}  |  {reportId}</Text>
        </View>

      </Page>
    </Document>
  );
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReportData {
  farm: any;
  analysis: any;
  farmAlerts: any[];
  feedback: any[];
  analytics: any;
  ndviHistory: any[];
  period: string;
  generatedAt: string;
  reportId: string;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ReportGenerator() {
  const { farms, alerts, feedbacks } = useAppStore();
  const [selectedFarm, setSelectedFarm] = useState('');
  const [reportPeriod, setReportPeriod] = useState('30');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<ReportData | null>(null);
  const [selectedSections, setSelectedSections] = useState({
    boundary: true, ndvi: true, predictions: true, alerts: true, feedback: true,
  });

  useEffect(() => {
    if (selectedFarm) loadPreview().then(setPreview);
  }, [selectedFarm, reportPeriod]);

  const loadPreview = async (): Promise<ReportData | null> => {
    const farm = farms.find(f => f.id === selectedFarm);
    if (!farm) return null;
    try {
      const [analysis, ndviHistory, analytics] = await Promise.all([
        aiAPI.getAnalysis(`farm-${selectedFarm}`),
        ndviHistoryAPI.getFarmHistory(selectedFarm, parseInt(reportPeriod)).catch(() => []),
        feedbackAPI.getAnalytics().catch(() => null),
      ]);

      const farmAlerts   = alerts.filter(a => a.farmId === selectedFarm);
      const farmFeedback = feedbacks.filter(f => f.farmId === selectedFarm);

      return {
        farm,
        analysis,
        farmAlerts,
        feedback: farmFeedback,
        analytics,
        ndviHistory,
        period: reportPeriod,
        generatedAt: new Date().toISOString(),
        reportId: `AV-${farm.id.toUpperCase().slice(0, 6)}-${Date.now().toString(36).toUpperCase()}`,
      };
    } catch (err) {
      console.error('Preview load failed:', err);
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedFarm) return;
    setGenerating(true);
    try {
      // Always fetch fresh data — do NOT use stale state
      const data = await loadPreview();
      if (!data) return;

      setPreview(data);
      const blob = await pdf(<FarmPDF data={data} />).toBlob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `AgriVision-Report_${data.farm.name.replace(/\s+/g, '-')}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Generate Farm Analysis Report</h3>

        <div>
          <label className="text-xs font-medium mb-1 block">Select Farm</label>
          <select
            className="w-full h-9 rounded-md border border-input bg-popover px-3 text-sm"
            value={selectedFarm}
            onChange={e => setSelectedFarm(e.target.value)}
          >
            <option value="">Choose a farm...</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Report Period</label>
          <select
            className="w-full h-9 rounded-md border border-input bg-popover px-3 text-sm"
            value={reportPeriod}
            onChange={e => setReportPeriod(e.target.value)}
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium mb-2 block">Include Sections</label>
          <div className="space-y-2">
            {[
              { key: 'ndvi',        label: 'NDVI History Table' },
              { key: 'predictions', label: 'AI Analysis Results' },
              { key: 'alerts',      label: 'Active Alerts' },
              { key: 'feedback',    label: 'Farmer Feedback & HIL Summary' },
              { key: 'boundary',    label: 'Recommendations & Action Plan' },
            ].map(s => (
              <label key={s.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedSections[s.key as keyof typeof selectedSections]}
                  onChange={e => setSelectedSections(prev => ({ ...prev, [s.key]: e.target.checked }))}
                  className="rounded border-input accent-primary"
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Preview card */}
      <div className="card-elevated p-4">
        <div className="flex items-center gap-3 mb-3">
          <FileText className="w-5 h-5 text-primary" />
          <div>
            <h4 className="text-sm font-semibold">Report Preview</h4>
            <p className="text-xs text-muted-foreground">
              {preview?.farm?.name || 'Select a farm'} &nbsp;•&nbsp; Last {reportPeriod} days
            </p>
          </div>
        </div>

        {preview ? (
          <div className="space-y-1 text-xs text-muted-foreground">
            {[
              ['NDVI Index',        preview.analysis.ndvi.toFixed(3),                               'text-foreground'],
              ['Health Score',      `${Math.round(preview.analysis.health_score)}%`,                 'text-foreground'],
              ['Yield Estimate',    `${preview.analysis.yield_prediction.toFixed(2)} t/ha`,          'text-success'],
              ['Active Alerts',     preview.farmAlerts.length,                                       preview.farmAlerts.length > 0 ? 'text-destructive' : 'text-foreground'],
              ['Feedback Records',  preview.feedback.length,                                         'text-foreground'],
              ['Ground-Truth Labels', preview.feedback.filter((f: any) => !f.correct && f.actualCropType).length, 'text-primary'],
              ['NDVI History Rows', preview.ndviHistory.length,                                      'text-foreground'],
              ['Model Accuracy',    `${preview.analytics?.model_accuracy ?? (preview.feedback.length > 0 ? Math.round(preview.feedback.filter((f: any) => f.correct).length / preview.feedback.length * 100) : 0)}%`, 'text-primary'],
            ].map(([label, value, cls]) => (
              <div key={label as string} className="flex justify-between py-1.5 border-b border-border last:border-0">
                <span>{label}</span>
                <span className={`font-medium ${cls}`}>{String(value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Select a farm to preview report</p>
          </div>
        )}
      </div>

      <Button onClick={handleDownloadPDF} disabled={!selectedFarm || generating} className="w-full">
        <Download className="w-4 h-4 mr-2" />
        {generating ? 'Generating PDF...' : 'Download Professional PDF Report'}
      </Button>
    </div>
  );
}
