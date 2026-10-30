import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const USER_ID = 'user-1';
const ink = '#18231f';
const muted = '#68736e';
const paper = '#f6f4ed';
const accent = '#e56b4b';

type EventItem = {
  id: string;
  name: string;
  venue: string;
  date: string;
  price: number;
  ticketsLeft: number;
};

type TicketItem = {
  id: string;
  code: string;
  checkedInAt: string | null;
  event: {
    id: string;
    name: string;
    venue: string;
    date: string;
    price: number;
  };
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': USER_ID,
      ...(options?.headers ?? {}),
    },
  });
  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  if (!response.ok) throw new Error(data?.message ?? 'Request failed.');
  return data as T;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatPrice(value: number) {
  return `¥${value.toLocaleString()}`;
}

function eventArtwork(event: EventItem) {
  if (/jazz/i.test(event.name)) return { icon: '♫', label: 'SOUND / SESSION', color: '#d9a24b', dark: '#45351f' };
  if (/cinema|film/i.test(event.name)) return { icon: '▰', label: 'SCREEN / OPEN AIR', color: '#7c9b83', dark: '#253c32' };
  return { icon: '✳', label: 'LIVE / TOKYO', color: '#df8061', dark: '#522f28' };
}

type EventFilter = 'ALL' | 'LIVE' | 'JAZZ' | 'FILM';

function eventCategory(event: EventItem): Exclude<EventFilter, 'ALL'> {
  if (/jazz/i.test(event.name)) return 'JAZZ';
  if (/cinema|film/i.test(event.name)) return 'FILM';
  return 'LIVE';
}

function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.stateCard}>
      <ActivityIndicator size="large" color={accent} />
      <Text style={styles.stateTitle}>Getting things ready</Text>
      <Text style={styles.stateText}>{label}</Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateIcon}>!</Text>
      <Text style={styles.stateTitle}>We couldn’t load this</Text>
      <Text style={styles.stateText}>{message}</Text>
      <TouchableOpacity style={styles.darkButton} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.darkButtonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

function EventsScreen() {
  const compact = useWindowDimensions().width < 560;
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EventFilter>('ALL');

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<EventItem[]>('/events');
      setEvents(data);
      setQuantities(Object.fromEntries(data.map((event) => [event.id, 1])));
    } catch (err: any) {
      setError(err.message || 'Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadEvents(); }, []);

  const bookTicket = async (event: EventItem) => {
    const quantity = quantities[event.id] ?? 1;
    setBookingId(event.id);
    setNotice(null);
    setBookingError(null);
    try {
      await apiFetch(`/events/${event.id}/book`, {
        method: 'POST',
        body: JSON.stringify({ quantity }),
      });
      setNotice(`${quantity} ${quantity === 1 ? 'ticket' : 'tickets'} secured for ${event.name}.`);
      await loadEvents();
    } catch (err: any) {
      setBookingError(err.message || 'Your booking could not be completed.');
    } finally {
      setBookingId(null);
    }
  };

  const visibleEvents = events.filter((event) => {
    const matchesSearch = `${event.name} ${event.venue}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesFilter = filter === 'ALL' || eventCategory(event) === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <LoadingState label="Finding the next good night out…" />;
  if (error) return <ErrorState message={error} onRetry={() => void loadEvents()} />;

  return (
    <ScrollView contentContainerStyle={[styles.pageContent, compact && styles.compactPageContent]} showsVerticalScrollIndicator={false}>
      <View style={styles.introRow}>
        <View style={styles.flexOne}>
          <Text style={styles.eyebrow}>YOUR CITY, AFTER HOURS</Text>
          <Text style={[styles.pageTitle, compact && styles.pageTitleCompact]}>Make a night{ '\n' }of it.</Text>
        </View>
        <View style={styles.locationBadge}>
          <Text style={styles.locationPin}>⌖</Text>
          <Text style={styles.locationText}>TOKYO{ '\n' }JAPAN</Text>
        </View>
      </View>

      <View style={[styles.featurePanel, compact && styles.featurePanelCompact]}>
        <View style={styles.featureCopy}>
          <Text style={styles.featureEyebrow}>OTA LIFE / SELECTS</Text>
          <Text style={styles.featureTitle}>Good things{ '\n' }happen live.</Text>
          <Text style={styles.featureSub}>Small rooms. Big memories.</Text>
        </View>
        <View style={[styles.featureOrb, compact && styles.featureOrbCompact]}><Text style={styles.featureMark}>Ō</Text></View>
        <Text style={styles.featureIndex}>01 — 03</Text>
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionKicker}>THE LINEUP</Text>
          <Text style={styles.sectionTitle}>Coming up</Text>
        </View>
        <Text style={styles.eventCount}>{events.length.toString().padStart(2, '0')} EVENTS</Text>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search events or venues"
          placeholderTextColor="#858b82"
          style={styles.searchInput}
          accessibilityLabel="Search events or venues"
          returnKeyType="search"
        />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Clear search"><Text style={styles.clearSearch}>×</Text></TouchableOpacity>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {(['ALL', 'LIVE', 'JAZZ', 'FILM'] as EventFilter[]).map((value) => (
          <TouchableOpacity key={value} onPress={() => setFilter(value)} style={[styles.filterChip, filter === value && styles.filterChipActive]} accessibilityRole="button" accessibilityState={{ selected: filter === value }}>
            <Text style={[styles.filterChipText, filter === value && styles.filterChipTextActive]}>{value === 'ALL' ? 'All events' : value === 'FILM' ? 'Film' : value.charAt(0) + value.slice(1).toLowerCase()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {notice && <View style={styles.notice}><Text style={styles.noticeMark}>✓</Text><Text style={styles.noticeText}>{notice} Find it in My tickets.</Text></View>}
      {bookingError && <View style={styles.inlineError}><Text style={styles.inlineErrorText}>{bookingError}</Text><TouchableOpacity onPress={() => setBookingError(null)} accessibilityRole="button"><Text style={styles.clearSearch}>×</Text></TouchableOpacity></View>}
      {events.length === 0 && <Text style={styles.emptyCopy}>No upcoming events right now. Check back soon.</Text>}
      {events.length > 0 && visibleEvents.length === 0 && <Text style={styles.emptyCopy}>No events match that search. Try another name or category.</Text>}

      {visibleEvents.map((event, index) => {
        const artwork = eventArtwork(event);
        const quantity = quantities[event.id] ?? 1;
        const soldOut = event.ticketsLeft === 0;
        return (
          <View key={event.id} style={styles.eventCard}>
            <View style={[styles.eventArtwork, { backgroundColor: artwork.color }]}>
              <View style={styles.artTopline}>
                <Text style={[styles.artLabel, { color: artwork.dark }]}>{artwork.label}</Text>
                <Text style={[styles.artNumber, { color: artwork.dark }]}>Nº {String(index + 1).padStart(2, '0')}</Text>
              </View>
              <Text style={[styles.artIcon, { color: artwork.dark }]}>{artwork.icon}</Text>
              <View style={[styles.artStamp, { borderColor: artwork.dark }]}><Text style={[styles.artStampText, { color: artwork.dark }]}>OTA{ '\n' }TOKYO</Text></View>
            </View>
            <View style={styles.eventBody}>
              <View style={styles.eventHeadingRow}>
                <Text style={styles.eventName}>{event.name}</Text>
                <View style={[styles.availabilityPill, soldOut && styles.soldOutPill]}>
                  <View style={[styles.availabilityDot, soldOut && styles.soldOutDot]} />
                  <Text style={[styles.availabilityText, soldOut && styles.soldOutText]}>{soldOut ? 'SOLD OUT' : `${event.ticketsLeft} LEFT`}</Text>
                </View>
              </View>
              <Text style={styles.eventVenue}>{event.venue}</Text>
              <View style={styles.eventMetaRow}>
                <Text style={styles.eventDate}>◷  {formatDate(event.date)}</Text>
                <Text style={styles.eventPrice}>{formatPrice(event.price)} <Text style={styles.perTicket}>/ ticket</Text></Text>
              </View>
              <View style={styles.bookingDivider} />
              <View style={styles.bookingRow}>
                <View>
                  <Text style={styles.quantityLabel}>HOW MANY?</Text>
                  <View style={styles.quantityRow}>
                    {[1, 2, 3, 4].map((value) => {
                      const unavailable = value > event.ticketsLeft;
                      const selected = quantity === value;
                      return (
                        <TouchableOpacity
                          key={value}
                          onPress={() => setQuantities((prev) => ({ ...prev, [event.id]: value }))}
                          disabled={unavailable || bookingId === event.id}
                          style={[styles.quantityButton, selected && styles.quantitySelected, unavailable && styles.quantityUnavailable]}
                          accessibilityRole="button"
                          accessibilityLabel={`${value} ${value === 1 ? 'ticket' : 'tickets'}`}
                          accessibilityState={{ selected, disabled: unavailable || bookingId === event.id }}
                        >
                          <Text style={[styles.quantityText, selected && styles.quantitySelectedText]}>{value}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => void bookTicket(event)}
                  disabled={soldOut || bookingId === event.id}
                  style={[styles.bookButton, (soldOut || bookingId === event.id) && styles.bookButtonDisabled]}
                  accessibilityRole="button"
                >
                  <Text style={styles.bookButtonText}>{bookingId === event.id ? 'BOOKING…' : soldOut ? 'SOLD OUT' : 'BOOK NOW  →'}</Text>
                </TouchableOpacity>
              </View>
              {!soldOut && <Text style={styles.totalPrice}>Total for {quantity}: {formatPrice(event.price * quantity)}</Text>}
            </View>
          </View>
        );
      })}
      <Text style={styles.footerNote}>MADE FOR THE NIGHTS YOU’LL REMEMBER · ŌTA LIFE</Text>
    </ScrollView>
  );
}

function TicketsScreen() {
  const compact = useWindowDimensions().width < 560;
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      setTickets(await apiFetch<TicketItem[]>('/me/tickets'));
    } catch (err: any) {
      setError(err.message || 'Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTickets(); }, []);
  if (loading) return <LoadingState label="Finding your tickets…" />;
  if (error) return <ErrorState message={error} onRetry={() => void loadTickets()} />;

  return (
    <ScrollView contentContainerStyle={[styles.pageContent, compact && styles.compactPageContent]} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>YOUR PLANS, ALL IN ONE PLACE</Text>
      <Text style={[styles.pageTitle, compact && styles.pageTitleCompact]}>The good{ '\n' }part starts here.</Text>
      <Text style={styles.ticketIntro}>Your tickets are ready when you are. Show the QR at the door.</Text>
      {tickets.length === 0 ? (
        <View style={styles.emptyTicketCard}>
          <Text style={styles.emptyTicketIcon}>✳</Text>
          <Text style={styles.emptyTicketTitle}>Nothing on the calendar yet.</Text>
          <Text style={styles.stateText}>Find an event you love and your tickets will show up here.</Text>
        </View>
      ) : tickets.map((ticket) => {
        const checkedIn = Boolean(ticket.checkedInAt);
        return (
          <View key={ticket.id} style={styles.ticketCard}>
            <View style={styles.ticketAccent} />
            <View style={styles.ticketTopline}>
              <Text style={styles.ticketBrand}>ŌTA LIFE  /  ADMIT ONE</Text>
              <View style={[styles.ticketStatus, checkedIn && styles.ticketStatusUsed]}>
                <View style={[styles.ticketStatusDot, checkedIn && styles.ticketStatusDotUsed]} />
                <Text style={[styles.ticketStatusText, checkedIn && styles.ticketStatusTextUsed]}>{checkedIn ? 'CHECKED IN' : 'READY TO GO'}</Text>
              </View>
            </View>
            <Text style={styles.ticketEvent}>{ticket.event.name}</Text>
            <View style={styles.ticketInfoRow}>
              <View style={styles.ticketInfoBlock}>
                <Text style={styles.ticketLabel}>WHEN</Text>
                <Text style={styles.ticketValue}>{formatDate(ticket.event.date)}</Text>
              </View>
              <View style={styles.ticketInfoBlock}>
                <Text style={styles.ticketLabel}>WHERE</Text>
                <Text style={styles.ticketValue}>{ticket.event.venue}</Text>
              </View>
            </View>
            <View style={styles.ticketPerforation}><View style={styles.perfHoleLeft} /><View style={styles.perfLine} /><View style={styles.perfHoleRight} /></View>
            <View style={[styles.qrSection, compact && styles.qrSectionCompact]}>
              <View style={styles.qrFrame}><QRCode value={ticket.code} size={compact ? 112 : 142} backgroundColor="white" color={ink} /></View>
              <View style={styles.qrDetails}>
                <Text style={styles.qrEyebrow}>YOUR ENTRY PASS</Text>
                <Text style={styles.qrTitle}>One scan.{ '\n' }One great night.</Text>
                <Text style={styles.ticketCode}>{ticket.code}</Text>
                <Text style={styles.qrHint}>Keep this code ready at the entrance.</Text>
              </View>
            </View>
          </View>
        );
      })}
      <Text style={styles.footerNote}>YOUR NEXT STORY STARTS AT THE DOOR · ŌTA LIFE</Text>
    </ScrollView>
  );
}

export default function App() {
  const [screen, setScreen] = useState<'events' | 'tickets'>('events');
  const compact = useWindowDimensions().width < 560;
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.shell}>
        <View style={[styles.topBar, compact && styles.topBarCompact]}>
          <View style={styles.brandLockup}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>Ō</Text></View>
            <View><Text style={styles.brandName}>ŌTA LIFE</Text><Text style={styles.brandCaption}>TOKYO, YOUR WAY</Text></View>
          </View>
          <View style={styles.navTabs}>
            <TouchableOpacity onPress={() => setScreen('events')} style={[styles.navTab, compact && styles.navTabCompact, screen === 'events' && styles.navTabActive]} accessibilityRole="button">
              <Text style={[styles.navTabText, screen === 'events' && styles.navTabTextActive]}>DISCOVER</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setScreen('tickets')} style={[styles.navTab, compact && styles.navTabCompact, screen === 'tickets' && styles.navTabActive]} accessibilityRole="button">
              <Text style={[styles.navTabText, screen === 'tickets' && styles.navTabTextActive]}>MY TICKETS</Text>
            </TouchableOpacity>
          </View>
          {!compact && <View style={styles.headerEdition}><Text style={styles.editionDot}>●</Text><Text style={styles.editionText}>EDITION 01</Text></View>}
        </View>
        <View style={styles.screenArea}>
          {screen === 'events' ? <EventsScreen /> : <TicketsScreen />}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: paper },
  shell: { flex: 1, width: '100%', maxWidth: 980, alignSelf: 'center' },
  topBar: { minHeight: 82, paddingHorizontal: 28, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#deded4', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: paper },
  topBarCompact: { minHeight: 72, paddingHorizontal: 15 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: ink, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#f6d6a7', fontSize: 25, fontWeight: '800' },
  brandName: { color: ink, fontWeight: '900', letterSpacing: 1.5, fontSize: 14 },
  brandCaption: { color: muted, fontSize: 9, letterSpacing: 1.5, marginTop: 3, fontWeight: '700' },
  navTabs: { flexDirection: 'row', backgroundColor: '#e9e7de', borderRadius: 999, padding: 4 },
  navTab: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999 },
  navTabCompact: { paddingHorizontal: 10 },
  navTabActive: { backgroundColor: ink },
  navTabText: { color: muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  navTabTextActive: { color: '#fffdf7' },
  headerEdition: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  editionDot: { color: accent, fontSize: 9 },
  editionText: { fontSize: 9, color: muted, letterSpacing: 1.4, fontWeight: '700' },
  screenArea: { flex: 1 },
  pageContent: { width: '100%', maxWidth: 780, alignSelf: 'center', paddingHorizontal: 26, paddingTop: 36, paddingBottom: 50 },
  compactPageContent: { paddingHorizontal: 17, paddingTop: 26 },
  introRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 },
  flexOne: { flex: 1 },
  eyebrow: { color: accent, fontWeight: '800', fontSize: 10, letterSpacing: 2.2, marginBottom: 10 },
  pageTitle: { color: ink, fontSize: 48, lineHeight: 49, fontWeight: '800', letterSpacing: -1.5 },
  pageTitleCompact: { fontSize: 40, lineHeight: 41 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 13, borderWidth: 1, borderColor: '#dad9cf', backgroundColor: '#fbfaf5', marginBottom: 4 },
  locationPin: { fontSize: 21, color: accent },
  locationText: { fontSize: 9, lineHeight: 13, fontWeight: '800', letterSpacing: 1.1, color: ink },
  featurePanel: { minHeight: 196, borderRadius: 22, backgroundColor: '#20372f', padding: 25, overflow: 'hidden', justifyContent: 'center', marginBottom: 38 },
  featurePanelCompact: { minHeight: 178, padding: 19, marginBottom: 30 },
  featureCopy: { zIndex: 2 },
  featureEyebrow: { color: '#d1a46d', fontWeight: '800', fontSize: 9, letterSpacing: 2 },
  featureTitle: { color: '#fffaf0', fontSize: 31, lineHeight: 33, fontWeight: '800', marginTop: 9, letterSpacing: -0.6 },
  featureSub: { color: '#c0cbbf', fontSize: 12, marginTop: 9 },
  featureOrb: { width: 190, height: 190, borderRadius: 95, backgroundColor: '#d4694a', position: 'absolute', right: -18, top: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eea07e' },
  featureOrbCompact: { width: 130, height: 130, borderRadius: 65, right: -26, top: 24 },
  featureMark: { color: '#f7c9a2', fontSize: 127, lineHeight: 140, fontWeight: '900', marginTop: -9 },
  featureIndex: { position: 'absolute', right: 22, bottom: 18, color: '#f8dfc4', fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  sectionKicker: { fontSize: 9, letterSpacing: 2, color: muted, fontWeight: '800', marginBottom: 5 },
  sectionTitle: { color: ink, fontSize: 25, fontWeight: '800', letterSpacing: -0.6 },
  eventCount: { color: muted, fontSize: 9, letterSpacing: 1.4, fontWeight: '800', paddingBottom: 4 },
  searchBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffefa', borderColor: '#e4e1d7', borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, marginBottom: 12 },
  searchIcon: { fontSize: 25, color: muted, marginRight: 9, marginTop: -3 },
  searchInput: { flex: 1, minHeight: 46, color: ink, fontSize: 13 },
  clearSearch: { color: muted, fontSize: 20, paddingHorizontal: 4 },
  filterRow: { gap: 8, paddingBottom: 18 },
  filterChip: { borderWidth: 1, borderColor: '#deddd3', backgroundColor: '#fbfaf5', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  filterChipActive: { backgroundColor: ink, borderColor: ink },
  filterChipText: { color: muted, fontSize: 10, fontWeight: '800' },
  filterChipTextActive: { color: '#fffdf7' },
  eventCard: { backgroundColor: '#fffefa', borderRadius: 18, overflow: 'hidden', marginBottom: 18, borderWidth: 1, borderColor: '#e9e6dc', elevation: 1 },
  eventArtwork: { height: 148, padding: 18, overflow: 'hidden', justifyContent: 'space-between' },
  artTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 },
  artLabel: { fontSize: 9, letterSpacing: 1.7, fontWeight: '900' },
  artNumber: { fontSize: 9, letterSpacing: 1.5, fontWeight: '800' },
  artIcon: { position: 'absolute', left: 25, top: 8, fontSize: 140, lineHeight: 165, fontWeight: '900', opacity: 0.84 },
  artStamp: { alignSelf: 'flex-end', borderWidth: 1, borderRadius: 999, width: 56, height: 56, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '10deg' }], marginBottom: -4 },
  artStampText: { fontSize: 8, lineHeight: 10, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  eventBody: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 17 },
  eventHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eventName: { flex: 1, color: ink, fontSize: 20, lineHeight: 24, fontWeight: '800', letterSpacing: -0.3 },
  availabilityPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#e8f1e6' },
  soldOutPill: { backgroundColor: '#f4e8e3' },
  availabilityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#588264' },
  soldOutDot: { backgroundColor: accent },
  availabilityText: { color: '#42634b', fontWeight: '900', fontSize: 8, letterSpacing: 0.7 },
  soldOutText: { color: '#a15038' },
  eventVenue: { color: muted, fontSize: 12, marginTop: 5 },
  eventMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  eventDate: { color: ink, fontSize: 11, fontWeight: '600' },
  eventPrice: { color: ink, fontSize: 15, fontWeight: '900' },
  perTicket: { color: muted, fontSize: 10, fontWeight: '500' },
  bookingDivider: { height: 1, backgroundColor: '#ece9e0', marginTop: 17, marginBottom: 14 },
  bookingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 },
  quantityLabel: { color: muted, fontSize: 8, letterSpacing: 1.3, fontWeight: '800', marginBottom: 7 },
  quantityRow: { flexDirection: 'row', gap: 6 },
  quantityButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f0eee7', alignItems: 'center', justifyContent: 'center' },
  quantitySelected: { backgroundColor: ink },
  quantityUnavailable: { opacity: 0.35 },
  quantityText: { color: ink, fontWeight: '800', fontSize: 12 },
  quantitySelectedText: { color: '#fff' },
  bookButton: { backgroundColor: accent, borderRadius: 11, paddingHorizontal: 17, height: 38, justifyContent: 'center', alignItems: 'center' },
  bookButtonDisabled: { backgroundColor: '#aaa9a1' },
  bookButtonText: { color: '#fffaf4', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  totalPrice: { color: muted, fontSize: 9, textAlign: 'right', marginTop: 9 },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#e6f1e5', borderRadius: 12, padding: 13, marginBottom: 15 },
  noticeMark: { color: '#356541', fontWeight: '900' },
  noticeText: { flex: 1, color: '#31533a', fontSize: 12, fontWeight: '600' },
  inlineError: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: '#f7e8e1', borderRadius: 12, padding: 13, marginBottom: 15 },
  inlineErrorText: { flex: 1, color: '#884534', fontSize: 12, fontWeight: '600' },
  emptyCopy: { color: muted, backgroundColor: '#fffefa', padding: 22, borderRadius: 16 },
  ticketIntro: { color: muted, fontSize: 14, lineHeight: 21, marginTop: 12, marginBottom: 24, maxWidth: 450 },
  ticketCard: { position: 'relative', overflow: 'hidden', backgroundColor: '#fffefa', borderRadius: 20, marginBottom: 18, borderWidth: 1, borderColor: '#e8e5db', elevation: 1 },
  ticketAccent: { height: 6, backgroundColor: accent },
  ticketTopline: { paddingHorizontal: 20, paddingTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  ticketBrand: { color: muted, fontSize: 8, letterSpacing: 1.2, fontWeight: '900' },
  ticketStatus: { flexDirection: 'row', gap: 6, alignItems: 'center', borderRadius: 999, backgroundColor: '#edf4e9', paddingHorizontal: 9, paddingVertical: 6 },
  ticketStatusUsed: { backgroundColor: '#f4e8e3' },
  ticketStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#588264' },
  ticketStatusDotUsed: { backgroundColor: accent },
  ticketStatusText: { color: '#42634b', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  ticketStatusTextUsed: { color: '#a15038' },
  ticketEvent: { color: ink, fontSize: 23, lineHeight: 28, fontWeight: '800', paddingHorizontal: 20, marginTop: 17 },
  ticketInfoRow: { flexDirection: 'row', gap: 20, paddingHorizontal: 20, marginTop: 16, marginBottom: 18 },
  ticketInfoBlock: { flex: 1 },
  ticketLabel: { color: muted, fontSize: 8, letterSpacing: 1.4, fontWeight: '900', marginBottom: 5 },
  ticketValue: { color: ink, fontSize: 11, fontWeight: '600' },
  ticketPerforation: { flexDirection: 'row', alignItems: 'center', height: 16 },
  perfHoleLeft: { width: 16, height: 16, borderRadius: 8, backgroundColor: paper, marginLeft: -8 },
  perfLine: { flex: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#d8d5cb' },
  perfHoleRight: { width: 16, height: 16, borderRadius: 8, backgroundColor: paper, marginRight: -8 },
  qrSection: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 20, paddingTop: 15, paddingBottom: 21 },
  qrSectionCompact: { gap: 11, paddingHorizontal: 13 },
  qrFrame: { padding: 9, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ece9e0' },
  qrDetails: { flex: 1 },
  qrEyebrow: { color: accent, fontSize: 8, letterSpacing: 1.4, fontWeight: '900' },
  qrTitle: { color: ink, fontSize: 19, lineHeight: 22, fontWeight: '800', marginTop: 7 },
  ticketCode: { color: ink, fontSize: 10, letterSpacing: 1.2, fontWeight: '900', marginTop: 12 },
  qrHint: { color: muted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  emptyTicketCard: { backgroundColor: '#fffefa', borderRadius: 18, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: '#e8e5db' },
  emptyTicketIcon: { fontSize: 34, color: accent, marginBottom: 12 },
  emptyTicketTitle: { color: ink, fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  stateCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffefa', borderRadius: 18, margin: 26, padding: 30, minHeight: 230, borderWidth: 1, borderColor: '#e8e5db' },
  stateIcon: { width: 36, height: 36, borderRadius: 18, textAlign: 'center', textAlignVertical: 'center', backgroundColor: '#f7e7df', color: accent, fontWeight: '900', fontSize: 19, overflow: 'hidden' },
  stateTitle: { color: ink, fontSize: 18, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  stateText: { color: muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6, maxWidth: 300 },
  darkButton: { marginTop: 17, backgroundColor: ink, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10 },
  darkButtonText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  footerNote: { color: '#96968c', fontSize: 8, textAlign: 'center', letterSpacing: 1.1, fontWeight: '800', marginTop: 12, marginBottom: 8 },
});
