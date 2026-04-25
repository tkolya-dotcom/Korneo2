import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/src/providers/AuthProvider';
import { atssApi } from '@/src/lib/supabase';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892A0',
  border: 'rgba(0, 217, 255, 0.15)',
  warning: '#F59E0B',
  success: '#10B981',
};

const RU = {
  title: '\u0410\u0422\u0421\u0421',
  subtitle:
    '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043f\u043b\u0430\u043d-\u0433\u0440\u0430\u0444\u0438\u043a\u0430 \u0438\u0437 Excel \u0438 \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u0442\u0430\u0431\u043b\u0438\u0446\u044b `atss_q1_2026`.',
  uploadTitle:
    '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043f\u043b\u0430\u043d-\u0433\u0440\u0430\u0444\u0438\u043a\u0430 \u0410\u0422\u0421\u0421',
  uploadHint:
    '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 `.xlsx` \u0441 \u043b\u0438\u0441\u0442\u043e\u043c \u00ab1 \u043a\u0432\u0430\u0440\u0442\u0430\u043b 2026\u00bb. \u041d\u043e\u0432\u044b\u0435 \u043f\u043b\u043e\u0449\u0430\u0434\u043a\u0438 \u0434\u043e\u0431\u0430\u0432\u044f\u0442\u0441\u044f, \u0438\u0437\u043c\u0435\u043d\u0438\u0432\u0448\u0438\u0435\u0441\u044f \u043e\u0431\u043d\u043e\u0432\u044f\u0442\u0441\u044f.',
  chooseUpload:
    '\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0444\u0430\u0439\u043b \u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c',
  loading: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...',
  search:
    '\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u0430\u0434\u0440\u0435\u0441\u0443, \u0440\u0430\u0439\u043e\u043d\u0443, ID \u043f\u043b\u043e\u0449\u0430\u0434\u043a\u0438',
  noRecords: '\u0417\u0430\u043f\u0438\u0441\u0438 \u0410\u0422\u0421\u0421 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b',
  noAddress: '\u0411\u0435\u0437 \u0430\u0434\u0440\u0435\u0441\u0430',
  site: '\u041f\u043b\u043e\u0449\u0430\u0434\u043a\u0430',
  serviceId: '\u0421\u0435\u0440\u0432\u0438\u0441\u043d\u044b\u0439 ID',
  district: '\u0420\u0430\u0439\u043e\u043d',
  plan: '\u041f\u043b\u0430\u043d',
  sk: '\u0421\u041a',
  emptyDash: '\u2014',
  readFile: '\ud83d\udcc2 \u0427\u0438\u0442\u0430\u0435\u043c \u0444\u0430\u0439\u043b',
  records: '\u041f\u043b\u043e\u0449\u0430\u0434\u043e\u043a \u0432 \u0444\u0430\u0439\u043b\u0435',
  sendBatches: '\u2b06 \u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0431\u0430\u0442\u0447\u0430\u043c\u0438 \u043f\u043e',
  done: '\u2705 \u0413\u043e\u0442\u043e\u0432\u043e. \u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u043e',
  uploadSuccess: '\u0423\u0441\u043f\u0435\u0445',
  uploadSuccessBody: '\u0410\u0422\u0421\u0421 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d',
  uploadWarnTitle:
    '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0441 \u043e\u0448\u0438\u0431\u043a\u0430\u043c\u0438',
  uploadWarnBody:
    '\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u043e \u0437\u0430\u043f\u0438\u0441\u0435\u0439',
  error: '\u041e\u0448\u0438\u0431\u043a\u0430',
  missingFilePath:
    '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u043f\u0443\u0442\u044c \u043a \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u043c\u0443 \u0444\u0430\u0439\u043b\u0443.',
  emptyFile: '\u041f\u0443\u0441\u0442\u043e\u0439 \u0444\u0430\u0439\u043b',
  emptyFileBody:
    '\u0412 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u043c \u0444\u0430\u0439\u043b\u0435 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e \u0437\u0430\u043f\u0438\u0441\u0435\u0439 \u0434\u043b\u044f \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438.',
  sheetMissing: '\u041b\u0438\u0441\u0442',
  notFound: '\u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d',
  available: '\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0435',
  doneWord: '\u0433\u043e\u0442\u043e\u0432\u043e',
  errorsWord: '\u043e\u0448\u0438\u0431\u043e\u043a',
  linesWord: '\u0421\u0442\u0440\u043e\u043a\u0438',
};

const ATSS_SHEET_NAME = `1 \u043a\u0432\u0430\u0440\u0442\u0430\u043b 2026`;
const ATSS_BATCH_SIZE = 50;

const formatDate = (value?: string | null) => {
  if (!value) return RU.emptyDash;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU');
};

const countSk = (row: Record<string, any>) => {
  let count = 0;
  for (let i = 1; i <= 6; i += 1) {
    const suffix = i === 1 ? '' : String(i);
    if (row[`id_sk${suffix}`]) count += 1;
  }
  return count;
};

const atssInt = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const atssStr = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!normalized || normalized === '-') return null;
  return normalized;
};

const atssDate = (value: unknown) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00`;
  }

  const compact = String(value).replace(/\D/g, '');
  if (compact.length === 8) {
    return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T00:00:00`;
  }

  const dotParts = String(value).split('.');
  if (dotParts.length === 3) {
    const [dayRaw, monthRaw, yearRaw] = dotParts;
    const day = dayRaw.padStart(2, '0');
    const month = monthRaw.padStart(2, '0');
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    if (day.length === 2 && month.length === 2 && year.length === 4) {
      return `${year}-${month}-${day}T00:00:00`;
    }
  }

  return null;
};

const atssParseXlsx = (base64Content: string) => {
  const workbook = XLSX.read(base64Content, { type: 'base64', cellDates: true });
  const sheet = workbook.Sheets[ATSS_SHEET_NAME];
  if (!sheet) {
    throw new Error(
      `${RU.sheetMissing} "${ATSS_SHEET_NAME}" ${RU.notFound}. ${RU.available}: ${workbook.SheetNames.join(', ')}`
    );
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as any[][];
  const groups = new Map<
    string,
    {
      tip: string | null;
      id_ploshadki: number | null;
      servisnyy_id: string | null;
      adres_razmeshcheniya: string | null;
      rayon: string | null;
      plan_date: unknown;
      sks: Array<{ id_sk: number | null; naim: string | null; status: string | null; tip_sk: number | null }>;
    }
  >();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row) continue;
    const [tip, idPl, serv, adres, rayon, idSk, naim, status, tipSk, plan] = row;
    if (tip == null && idPl == null && serv == null) continue;

    const key = `${serv ?? ''}__${idPl ?? ''}`;
    if (!groups.has(key)) {
      groups.set(key, {
        tip: atssStr(tip),
        id_ploshadki: atssInt(idPl),
        servisnyy_id: atssStr(serv),
        adres_razmeshcheniya: atssStr(adres),
        rayon: atssStr(rayon),
        plan_date: null,
        sks: [],
      });
    }

    const group = groups.get(key)!;
    if (plan && group.plan_date == null) {
      group.plan_date = plan;
    }
    group.sks.push({
      id_sk: atssInt(idSk),
      naim: atssStr(naim),
      status: atssStr(status),
      tip_sk: atssInt(tipSk),
    });
  }

  return [...groups.values()].map((group) => {
    const record: Record<string, unknown> = {
      tip: group.tip,
      id_ploshadki: group.id_ploshadki,
      servisnyy_id: group.servisnyy_id,
      adres_razmeshcheniya: group.adres_razmeshcheniya,
      rayon: group.rayon,
      planovaya_data_1_kv_2026: atssDate(group.plan_date),
      id_sk: null,
      naimenovanie_sk: null,
      status_oborudovaniya: null,
      tip_sk_po_dogovoru: null,
      id_sk2: null,
      naimenovanie_sk2: null,
      status_oborudovaniya2: null,
      tip_sk_po_dogovoru2: null,
      id_sk3: null,
      naimenovanie_sk3: null,
      status_oborudovaniya3: null,
      tip_sk_po_dogovoru3: null,
      id_sk4: null,
      naimenovanie_sk4: null,
      status_oborudovaniya4: null,
      tip_sk_po_dogovoru4: null,
      id_sk5: null,
      naimenovanie_sk5: null,
      status_oborudovaniya5: null,
      tip_sk_po_dogovoru5: null,
      id_sk6: null,
      naimenovanie_sk6: null,
      status_oborudovaniya6: null,
      tip_sk_po_dogovoru6: null,
    };

    group.sks.slice(0, 6).forEach((sk, index) => {
      const suffix = index === 0 ? '' : String(index + 1);
      record[`id_sk${suffix}`] = sk.id_sk;
      record[`naimenovanie_sk${suffix}`] = sk.naim;
      record[`status_oborudovaniya${suffix}`] = sk.status;
      record[`tip_sk_po_dogovoru${suffix}`] = sk.tip_sk;
    });

    return record;
  });
};

export default function AtssScreen() {
  const { canViewAtss } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<any[]>([]);

  const [uploading, setUploading] = useState(false);
  const [progressDone, setProgressDone] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressErrors, setProgressErrors] = useState(0);
  const [uploadLog, setUploadLog] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!canViewAtss) {
      setRows([]);
      return;
    }

    try {
      const data = await atssApi.getAll();
      setRows(data || []);
    } catch (error) {
      console.error('Failed to load ATSS:', error);
      setRows([]);
    }
  }, [canViewAtss]);

  useEffect(() => {
    let active = true;
    load().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const appendLog = (message: string) => {
    setUploadLog((prev) => [...prev, message]);
  };

  const uploadXlsx = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const file = result.assets[0];
      if (!file.uri) {
        Alert.alert(RU.error, RU.missingFilePath);
        return;
      }

      setUploading(true);
      setProgressDone(0);
      setProgressTotal(0);
      setProgressErrors(0);
      setUploadLog([]);

      appendLog(`${RU.readFile}: ${file.name || 'ATSS.xlsx'}`);
      const base64Content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const records = atssParseXlsx(base64Content);
      appendLog(`${RU.records}: ${records.length}`);

      if (!records.length) {
        Alert.alert(RU.emptyFile, RU.emptyFileBody);
        return;
      }

      appendLog(`${RU.sendBatches} ${ATSS_BATCH_SIZE}...`);
      const resultUpload = await atssApi.upsertBatches(records, {
        batchSize: ATSS_BATCH_SIZE,
        onProgress: (done, total, errorsCount) => {
          setProgressDone(done);
          setProgressTotal(total);
          setProgressErrors(errorsCount);
        },
      });

      if (resultUpload.errors.length === 0) {
        appendLog(`${RU.done}: ${resultUpload.done}`);
        Alert.alert(RU.uploadSuccess, `${RU.uploadSuccessBody}: ${resultUpload.done}.`);
      } else {
        resultUpload.errors.forEach((err) => {
          appendLog(`\u2717 ${RU.linesWord} ${err.from}-${err.to}: ${err.message}`);
        });
        Alert.alert(
          RU.uploadWarnTitle,
          `${RU.uploadWarnBody} ${resultUpload.done}. ${RU.errorsWord}: ${resultUpload.errors.length}.`
        );
      }

      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : RU.error;
      appendLog(`\u274c ${message}`);
      Alert.alert(RU.error, message);
    } finally {
      setUploading(false);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) => {
      const haystack = [
        row.adres_razmeshcheniya,
        row.rayon,
        row.servisnyy_id,
        row.id_ploshadki ? String(row.id_ploshadki) : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, search]);

  const progressPercent = useMemo(() => {
    if (!progressTotal) return 0;
    return Math.round((progressDone / progressTotal) * 100);
  }, [progressDone, progressTotal]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!canViewAtss) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>{'Недостаточно прав для просмотра АТСС'}</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{RU.title}</Text>
        <Text style={s.count}>{filtered.length}</Text>
      </View>

      <Text style={s.subtitle}>{RU.subtitle}</Text>

      <View style={s.uploadCard}>
        <Text style={s.uploadTitle}>{RU.uploadTitle}</Text>
        <Text style={s.uploadHint}>{RU.uploadHint}</Text>

        <TouchableOpacity
          style={[s.uploadBtn, uploading && s.uploadBtnDisabled]}
          onPress={() => {
            void uploadXlsx();
          }}
          disabled={uploading}
        >
          <Text style={s.uploadBtnText}>{uploading ? RU.loading : RU.chooseUpload}</Text>
        </TouchableOpacity>

        {uploading || progressTotal > 0 ? (
          <View style={s.progressWrap}>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={s.progressText}>
              {progressDone} / {progressTotal || RU.emptyDash} • {RU.errorsWord}: {progressErrors}
            </Text>
          </View>
        ) : null}

        {uploadLog.length > 0 ? (
          <View style={s.logBox}>
            <ScrollView style={{ maxHeight: 120 }}>
              {uploadLog.map((line, index) => (
                <Text key={`${index}-${line}`} style={s.logText}>
                  {line}
                </Text>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>

      <TextInput
        style={s.search}
        value={search}
        onChangeText={setSearch}
        placeholder={RU.search}
        placeholderTextColor={C.sub}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => String(item.id_ploshadki || item.servisnyy_id || index)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 18 }}
        ListEmptyComponent={<Text style={s.empty}>{RU.noRecords}</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.address}>{item.adres_razmeshcheniya || RU.noAddress}</Text>
            <Text style={s.meta}>
              {RU.site}: {item.id_ploshadki || RU.emptyDash} • {RU.serviceId}:{' '}
              {item.servisnyy_id || RU.emptyDash}
            </Text>
            <Text style={s.meta}>
              {RU.district}: {item.rayon || RU.emptyDash}
            </Text>
            <View style={s.footerRow}>
              <Text style={s.plan}>
                {RU.plan}: {formatDate(item.planovaya_data_1_kv_2026)}
              </Text>
              <Text style={s.sk}>
                {RU.sk}: {countSk(item)}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
  },
  title: { color: C.text, fontSize: 26, fontWeight: '700' },
  count: { color: C.sub, fontSize: 16 },
  subtitle: { color: C.sub, fontSize: 12, paddingHorizontal: 20, marginTop: 4, marginBottom: 8 },
  uploadCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
  uploadTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  uploadHint: { color: C.sub, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  uploadBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'rgba(0,217,255,0.15)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { color: C.accent, fontSize: 13, fontWeight: '700' },
  progressWrap: { marginTop: 10 },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.success,
    borderRadius: 999,
  },
  progressText: { color: C.sub, fontSize: 11, marginTop: 5 },
  logBox: {
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'rgba(10,10,15,0.75)',
    padding: 8,
  },
  logText: { color: C.sub, fontSize: 11, lineHeight: 16 },
  search: {
    backgroundColor: C.card,
    color: C.text,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  address: { color: C.text, fontSize: 14, fontWeight: '700' },
  meta: { color: C.sub, fontSize: 11, marginTop: 4 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  plan: { color: C.accent, fontSize: 12, fontWeight: '600' },
  sk: { color: C.warning, fontSize: 12, fontWeight: '600' },
  empty: { color: C.sub, textAlign: 'center', marginTop: 60, fontSize: 16 },
});
