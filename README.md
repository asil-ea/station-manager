# İstasyon Yöneticisi

İstasyon Yöneticisi, istasyonların yönetimi ve bakımı ile ilgilenen bir uygulamadır. Bu uygulama, istasyonların durumunu izlemek, temizlik ve bakım işlerini analiz etmek ve istasyonların performansını artırmak için çeşitli araçlar sunar.

## Özellikler

### İstasyon Görevlisi
- İstasyon görevlilerinin temizlik ve bakım işlerini uygulama içerisine girme
- İstasyon örevlilerinin vardiya girişlerini yapabilmesi

### İstasyon Yöneticisi
- İstasyonların temizlik ve bakım işlerini takip edebilmesi
- İstasyon görevlilerinin vardiya girişlerini takip edebilmesi
- İstasyon görevlilerinin vardiya listesini oluşturabilmesi ve düzenleyebilmesi
- İskonto taleplerini inceleyerek uygun plakalar için iskonto oranı tanımlayabilmesi

## İskonto Talep Süreci

- İstasyon görevlileri, iskonto listesinde bulunmayan plakalar için uygulama üzerinden talep iletebilir.
- Yöneticiler, bekleyen talepleri admin panelinden görüntüleyip iskonto oranlarını belirleyerek onaylayabilir veya gerekçe belirterek reddedebilir.

### Supabase Tablosu

Yeni talep sürecini kullanabilmek için Supabase veritabanınızda aşağıdaki tabloyu oluşturun:

```sql
create table if not exists public.iskonto_plaka_talepleri (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone not null default now(),
  plaka text not null,
  aciklama text,
  durum text not null default 'pending',
  requested_by uuid not null,
  requested_by_email text,
  requested_by_name text,
  processed_at timestamp with time zone,
  processed_by uuid,
  processed_by_name text,
  oran_nakit double precision,
  oran_kredi double precision,
  onaylanan_plaka_id bigint references public.iskonto_listesi(id),
  reddetme_notu text
);
```

## Bakım ve Temizlik Takibi
* İstasyon görevlileri, temizlik ve bakım işlerini uygulama üzerinden kaydedebilir.
  * Görevliler, yaptıkları işlemleri, çektiği fotoğrafları, ve notları uygulama üzerinden girebilir.
* İstasyon yöneticileri, bu kayıtları takip edebilir ve analiz edebilir. 