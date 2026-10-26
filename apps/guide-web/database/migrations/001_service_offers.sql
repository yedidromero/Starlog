-- Initial Starlog service-offer schema for MariaDB 10.3+.
-- Authentication, user roles, bookings and payments are intentionally outside this migration.

CREATE TABLE IF NOT EXISTS providers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  display_name VARCHAR(160) NOT NULL,
  legal_name VARCHAR(180) NULL,
  contact_email VARCHAR(254) NULL,
  contact_phone VARCHAR(40) NULL,
  status ENUM('draft', 'active', 'suspended') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_providers_status (status),
  KEY idx_providers_display_name (display_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS listings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id BIGINT UNSIGNED NOT NULL,
  kind ENUM('event', 'accommodation', 'experience') NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  country_code CHAR(2) NULL,
  region VARCHAR(100) NULL,
  city VARCHAR(100) NULL,
  address VARCHAR(255) NULL,
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  base_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'MXN',
  status ENUM('draft', 'pending_review', 'published', 'rejected', 'archived') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_listings_provider_status (provider_id, status),
  KEY idx_listings_kind_status (kind, status),
  KEY idx_listings_city (city),
  CONSTRAINT fk_listings_provider
    FOREIGN KEY (provider_id) REFERENCES providers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_details (
  listing_id BIGINT UNSIGNED NOT NULL,
  venue_name VARCHAR(180) NULL,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  capacity INT UNSIGNED NULL,
  PRIMARY KEY (listing_id),
  CONSTRAINT fk_event_details_listing
    FOREIGN KEY (listing_id) REFERENCES listings (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS accommodation_details (
  listing_id BIGINT UNSIGNED NOT NULL,
  property_type ENUM('hotel', 'hostel', 'guesthouse', 'apartment', 'other') NOT NULL DEFAULT 'hotel',
  check_in_from TIME NULL,
  check_out_until TIME NULL,
  PRIMARY KEY (listing_id),
  CONSTRAINT fk_accommodation_details_listing
    FOREIGN KEY (listing_id) REFERENCES listings (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS room_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  accommodation_listing_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(140) NOT NULL,
  description TEXT NULL,
  max_guests TINYINT UNSIGNED NOT NULL DEFAULT 1,
  quantity SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  price_per_night DECIMAL(12, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'MXN',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_room_types_accommodation (accommodation_listing_id),
  CONSTRAINT fk_room_types_accommodation
    FOREIGN KEY (accommodation_listing_id) REFERENCES accommodation_details (listing_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS experience_details (
  listing_id BIGINT UNSIGNED NOT NULL,
  duration_minutes SMALLINT UNSIGNED NULL,
  min_group_size SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  max_group_size SMALLINT UNSIGNED NULL,
  meeting_point VARCHAR(255) NULL,
  PRIMARY KEY (listing_id),
  CONSTRAINT fk_experience_details_listing
    FOREIGN KEY (listing_id) REFERENCES listings (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
