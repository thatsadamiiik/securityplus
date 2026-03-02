-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Hostiteľ: 172.17.0.1:3306
-- Čas generovania: St 11.Feb 2026, 16:57
-- Verzia serveru: 8.0.32-24
-- Verzia PHP: 8.3.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Databáza: `securityplus`
--

DELIMITER $$
--
-- Procedúry
--
CREATE DEFINER=`humajadam`@`%` PROCEDURE `check_household_member_limit` (IN `household_id_param` INT, OUT `can_add` BOOLEAN)   BEGIN
    DECLARE member_count INT;
    
    SELECT COUNT(*) INTO member_count 
    FROM household_users 
    WHERE household_id = household_id_param AND is_active = TRUE;
    
    IF member_count < 7 THEN  -- Admin + 6 členov
        SET can_add = TRUE;
    ELSE
        SET can_add = FALSE;
    END IF;
END$$

CREATE DEFINER=`humajadam`@`%` PROCEDURE `generate_household_key` (OUT `new_key` VARCHAR(20))   BEGIN
    DECLARE key_exists INT DEFAULT 1;
    DECLARE temp_key VARCHAR(20);
    
    WHILE key_exists > 0 DO
        SET temp_key = CONCAT('DOM-', YEAR(NOW()), '-', 
                              UPPER(SUBSTRING(MD5(RAND()), 1, 6)));
        SELECT COUNT(*) INTO key_exists FROM households WHERE household_key = temp_key;
    END WHILE;
    
    SET new_key = temp_key;
END$$

CREATE DEFINER=`humajadam`@`%` PROCEDURE `log_sensor_event` (IN `household_id_param` INT, IN `sensor_id_param` INT, IN `event_type_param` VARCHAR(50), IN `severity_param` VARCHAR(20), IN `description_param` TEXT)   BEGIN
    INSERT INTO events (household_id, sensor_id, event_type, severity, description)
    VALUES (household_id_param, sensor_id_param, event_type_param, severity_param, description_param);
    
    -- Aktualizovať čas poslednej aktivácie senzora
    UPDATE sensors 
    SET last_triggered = NOW(), status = 'triggered'
    WHERE id = sensor_id_param;
END$$

CREATE DEFINER=`humajadam`@`%` PROCEDURE `sp_activate_buzzer` (IN `p_household_id` INT, IN `p_event_id` INT)   BEGIN
  UPDATE buzzer_status
  SET 
    is_active = TRUE,
    triggered_by_event_id = p_event_id,
    activated_at = CURRENT_TIMESTAMP,
    deactivated_at = NULL,
    deactivated_by = NULL
  WHERE household_id = p_household_id;
  
  IF ROW_COUNT() = 0 THEN
    INSERT INTO buzzer_status (household_id, is_active, triggered_by_event_id, activated_at)
    VALUES (p_household_id, TRUE, p_event_id, CURRENT_TIMESTAMP);
  END IF;
  
  UPDATE events
  SET triggered_buzzer = TRUE
  WHERE id = p_event_id;
END$$

CREATE DEFINER=`humajadam`@`%` PROCEDURE `sp_deactivate_buzzer` (IN `p_household_id` INT, IN `p_user_id` INT)   BEGIN
  UPDATE buzzer_status
  SET 
    is_active = FALSE,
    deactivated_at = CURRENT_TIMESTAMP,
    deactivated_by = p_user_id
  WHERE household_id = p_household_id AND is_active = TRUE;
END$$

CREATE DEFINER=`humajadam`@`%` PROCEDURE `sp_update_heartbeat` (IN `p_household_id` INT, IN `p_device_type` VARCHAR(50), IN `p_ip_address` VARCHAR(45), IN `p_rssi` INT)   BEGIN
  INSERT INTO system_heartbeat (household_id, device_type, ip_address, rssi, last_seen, is_online)
  VALUES (p_household_id, p_device_type, p_ip_address, p_rssi, CURRENT_TIMESTAMP, TRUE)
  ON DUPLICATE KEY UPDATE
    ip_address = p_ip_address,
    rssi = p_rssi,
    last_seen = CURRENT_TIMESTAMP,
    is_online = TRUE;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `activity_log`
--

CREATE TABLE `activity_log` (
  `id` int NOT NULL,
  `household_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `user_type` enum('company_owner','household_user') COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Sťahujem dáta pre tabuľku `activity_log`
--

INSERT INTO `activity_log` (`id`, `household_id`, `user_id`, `user_type`, `action`, `description`, `ip_address`, `timestamp`) VALUES
(1, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2025-12-05 20:37:29'),
(2, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2025-12-08 09:03:12'),
(3, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2025-12-08 09:03:13'),
(4, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2025-12-08 10:10:34'),
(5, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2025-12-08 10:10:37'),
(6, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2025-12-08 10:10:53'),
(7, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2025-12-08 10:10:54'),
(8, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-06 19:01:44'),
(9, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2026-02-06 19:01:47'),
(10, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-08 14:52:20'),
(11, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2026-02-08 14:52:29'),
(12, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-08 14:52:32'),
(13, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2026-02-08 14:53:39'),
(14, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-08 14:53:40'),
(15, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2026-02-08 14:55:32'),
(16, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-08 14:55:33'),
(17, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2026-02-10 15:50:26'),
(18, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-10 15:50:30'),
(19, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2026-02-10 16:10:44'),
(20, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-10 16:10:45'),
(21, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2026-02-11 14:11:21'),
(22, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-11 14:12:15'),
(23, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2026-02-11 14:37:24'),
(24, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-11 14:37:26'),
(25, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2026-02-11 14:38:11'),
(26, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-11 14:41:01'),
(27, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2026-02-11 14:43:37'),
(28, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-11 14:45:27'),
(29, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2026-02-11 14:48:45'),
(30, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-11 14:48:47'),
(31, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2026-02-11 15:04:04'),
(32, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-11 15:06:59'),
(33, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2026-02-11 15:18:08'),
(34, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-11 15:18:41'),
(35, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2026-02-11 15:20:48'),
(36, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-11 15:22:48'),
(37, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2026-02-11 15:28:23'),
(38, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-11 15:32:58'),
(39, 1, 1, 'household_user', 'alarm_toggled', 'Alarm aktivovaný', NULL, '2026-02-11 15:37:29'),
(40, 1, 1, 'household_user', 'alarm_toggled', 'Alarm deaktivovaný', NULL, '2026-02-11 15:47:43');

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `api_logs`
--

CREATE TABLE `api_logs` (
  `id` int NOT NULL,
  `household_id` int DEFAULT NULL,
  `endpoint` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `method` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_code` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_body` text COLLATE utf8mb4_unicode_ci,
  `response_body` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `buzzer_status`
--

CREATE TABLE `buzzer_status` (
  `id` int NOT NULL,
  `household_id` int NOT NULL,
  `is_active` tinyint(1) DEFAULT '0',
  `triggered_by_event_id` int DEFAULT NULL,
  `activated_at` timestamp NULL DEFAULT NULL,
  `deactivated_at` timestamp NULL DEFAULT NULL,
  `deactivated_by` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Sťahujem dáta pre tabuľku `buzzer_status`
--

INSERT INTO `buzzer_status` (`id`, `household_id`, `is_active`, `triggered_by_event_id`, `activated_at`, `deactivated_at`, `deactivated_by`) VALUES
(1, 1, 0, NULL, '2026-02-11 15:47:37', '2026-02-11 15:47:45', 1),
(2, 2, 0, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `company_owners`
--

CREATE TABLE `company_owners` (
  `id` int NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Sťahujem dáta pre tabuľku `company_owners`
--

INSERT INTO `company_owners` (`id`, `username`, `password_hash`, `full_name`, `email`, `phone`, `created_at`, `last_login`, `is_active`) VALUES
(1, 'humajadam', '$2a$10$yOAtzsLtZR3DAXwheD7DUeX2VcDVgoZDZiprWGwBQ2DckKETRT3O2', 'Adam Humaj', 'iamhumajadam@gmail.com', '+421900000000', '2025-12-03 18:52:27', '2025-12-13 20:56:04', 1),
(2, 'test', '', 'Testovací účet', '', NULL, '2025-12-08 09:02:14', NULL, 1);

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `events`
--

CREATE TABLE `events` (
  `id` int NOT NULL,
  `household_id` int NOT NULL,
  `sensor_id` int DEFAULT NULL,
  `event_type` enum('motion_detected','door_opened','door_closed','window_opened','window_closed','alarm_triggered','alarm_activated','alarm_deactivated','sensor_error','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` enum('info','warning','alert','critical') COLLATE utf8mb4_unicode_ci DEFAULT 'info',
  `description` text COLLATE utf8mb4_unicode_ci,
  `triggered_buzzer` tinyint(1) DEFAULT '0',
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `acknowledged` tinyint(1) DEFAULT '0',
  `acknowledged_by` int DEFAULT NULL,
  `acknowledged_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Sťahujem dáta pre tabuľku `events`
--

INSERT INTO `events` (`id`, `household_id`, `sensor_id`, `event_type`, `severity`, `description`, `triggered_buzzer`, `timestamp`, `acknowledged`, `acknowledged_by`, `acknowledged_at`) VALUES
(1, 1, 1, 'door_opened', 'info', 'Hlavné dvere boli otvorené', 0, '2025-12-03 18:52:28', 0, NULL, NULL),
(2, 1, 4, 'motion_detected', 'info', 'Zaznamenaný pohyb v chodbe', 0, '2025-12-03 18:52:28', 0, NULL, NULL),
(3, 1, 2, 'window_opened', 'warning', 'Okno v obývačke bolo otvorené', 0, '2025-12-03 18:52:28', 1, 1, '2025-12-05 21:26:40'),
(4, 2, NULL, 'alarm_triggered', 'alert', 'Alarm spustený - dvere otvorené pri aktívnom alarme', 0, '2025-12-03 18:52:28', 0, NULL, NULL),
(5, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2025-12-05 20:37:29', 0, NULL, NULL),
(6, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2025-12-08 09:03:12', 0, NULL, NULL),
(7, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2025-12-08 09:03:13', 0, NULL, NULL),
(8, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2025-12-08 10:10:34', 0, NULL, NULL),
(9, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2025-12-08 10:10:37', 0, NULL, NULL),
(10, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2025-12-08 10:10:53', 0, NULL, NULL),
(11, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2025-12-08 10:10:54', 0, NULL, NULL),
(12, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-06 19:01:44', 0, NULL, NULL),
(13, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2026-02-06 19:01:47', 0, NULL, NULL),
(17, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-08 14:52:20', 0, NULL, NULL),
(18, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2026-02-08 14:52:29', 0, NULL, NULL),
(19, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-08 14:52:32', 1, 1, '2026-02-10 15:49:29'),
(20, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2026-02-08 14:53:38', 1, 1, '2026-02-10 15:49:27'),
(21, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-08 14:53:39', 1, 1, '2026-02-10 15:49:25'),
(22, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2026-02-08 14:55:32', 1, 1, '2026-02-08 15:45:20'),
(23, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-08 14:55:33', 1, 1, '2026-02-08 15:45:17'),
(24, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2026-02-10 15:50:26', 0, NULL, NULL),
(25, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-10 15:50:30', 0, NULL, NULL),
(26, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:52:35', 0, NULL, NULL),
(27, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:52:38', 0, NULL, NULL),
(28, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:52:41', 0, NULL, NULL),
(29, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:52:47', 0, NULL, NULL),
(30, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:52:48', 0, NULL, NULL),
(31, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:53:03', 0, NULL, NULL),
(32, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:53:12', 0, NULL, NULL),
(33, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:53:16', 0, NULL, NULL),
(34, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:53:19', 0, NULL, NULL),
(35, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:53:22', 0, NULL, NULL),
(36, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:53:28', 0, NULL, NULL),
(37, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:53:32', 0, NULL, NULL),
(38, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:53:38', 0, NULL, NULL),
(39, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:53:41', 0, NULL, NULL),
(40, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:53:48', 0, NULL, NULL),
(41, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:53:51', 0, NULL, NULL),
(42, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:53:52', 0, NULL, NULL),
(43, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:53:54', 0, NULL, NULL),
(44, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:54:07', 0, NULL, NULL),
(45, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:54:10', 0, NULL, NULL),
(46, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:54:13', 0, NULL, NULL),
(47, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:54:16', 0, NULL, NULL),
(48, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:54:18', 0, NULL, NULL),
(49, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:54:22', 0, NULL, NULL),
(50, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:54:26', 0, NULL, NULL),
(51, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:54:35', 0, NULL, NULL),
(52, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:54:48', 0, NULL, NULL),
(53, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:54:54', 0, NULL, NULL),
(54, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:55:01', 0, NULL, NULL),
(55, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:55:16', 0, NULL, NULL),
(56, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:55:20', 0, NULL, NULL),
(57, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:55:35', 0, NULL, NULL),
(58, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:55:39', 0, NULL, NULL),
(59, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:55:42', 0, NULL, NULL),
(60, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:55:55', 0, NULL, NULL),
(61, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:56:08', 0, NULL, NULL),
(62, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:56:14', 0, NULL, NULL),
(63, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:56:17', 0, NULL, NULL),
(64, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:56:27', 0, NULL, NULL),
(65, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:56:30', 0, NULL, NULL),
(66, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:56:33', 0, NULL, NULL),
(67, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:56:36', 0, NULL, NULL),
(68, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:56:49', 0, NULL, NULL),
(69, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:56:52', 0, NULL, NULL),
(70, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:57:01', 0, NULL, NULL),
(71, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:57:02', 0, NULL, NULL),
(72, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:57:03', 0, NULL, NULL),
(73, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:57:05', 0, NULL, NULL),
(74, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:57:08', 0, NULL, NULL),
(75, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:57:11', 0, NULL, NULL),
(76, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:57:14', 0, NULL, NULL),
(77, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:57:19', 0, NULL, NULL),
(78, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:57:21', 0, NULL, NULL),
(79, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:57:27', 0, NULL, NULL),
(80, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:57:34', 0, NULL, NULL),
(81, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:57:37', 0, NULL, NULL),
(82, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:57:43', 0, NULL, NULL),
(83, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:57:46', 0, NULL, NULL),
(84, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:57:51', 0, NULL, NULL),
(85, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:58:02', 0, NULL, NULL),
(86, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:58:05', 0, NULL, NULL),
(87, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:58:18', 0, NULL, NULL),
(88, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:58:27', 0, NULL, NULL),
(89, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:58:34', 0, NULL, NULL),
(90, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:58:40', 0, NULL, NULL),
(91, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:58:47', 0, NULL, NULL),
(92, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:58:51', 0, NULL, NULL),
(93, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:58:53', 0, NULL, NULL),
(94, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:59:06', 0, NULL, NULL),
(95, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:59:09', 0, NULL, NULL),
(96, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:59:15', 0, NULL, NULL),
(97, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:59:20', 0, NULL, NULL),
(98, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:59:31', 0, NULL, NULL),
(99, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:59:34', 0, NULL, NULL),
(100, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 15:59:56', 0, NULL, NULL),
(101, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:00:03', 0, NULL, NULL),
(102, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:00:06', 0, NULL, NULL),
(103, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:00:15', 0, NULL, NULL),
(104, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:00:19', 0, NULL, NULL),
(105, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:00:20', 0, NULL, NULL),
(106, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:00:22', 0, NULL, NULL),
(107, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:00:28', 0, NULL, NULL),
(108, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:00:34', 0, NULL, NULL),
(109, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:00:38', 0, NULL, NULL),
(110, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:00:41', 0, NULL, NULL),
(111, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:00:47', 0, NULL, NULL),
(112, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:00:50', 0, NULL, NULL),
(113, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:00:53', 0, NULL, NULL),
(114, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:01:00', 0, NULL, NULL),
(115, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:01:03', 0, NULL, NULL),
(116, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:01:13', 0, NULL, NULL),
(117, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:10:36', 0, NULL, NULL),
(118, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:10:40', 0, NULL, NULL),
(119, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:10:43', 0, NULL, NULL),
(120, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2026-02-10 16:10:44', 0, NULL, NULL),
(121, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-10 16:10:45', 0, NULL, NULL),
(122, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:11:02', 0, NULL, NULL),
(123, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:11:03', 0, NULL, NULL),
(124, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:11:08', 0, NULL, NULL),
(125, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:12:24', 0, NULL, NULL),
(126, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:12:25', 0, NULL, NULL),
(127, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:12:28', 0, NULL, NULL),
(128, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:12:35', 0, NULL, NULL),
(129, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:12:41', 0, NULL, NULL),
(130, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:12:44', 0, NULL, NULL),
(131, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:12:49', 0, NULL, NULL),
(132, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:12:50', 0, NULL, NULL),
(133, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:13:03', 0, NULL, NULL),
(134, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:13:06', 0, NULL, NULL),
(135, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:13:13', 0, NULL, NULL),
(136, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:13:19', 0, NULL, NULL),
(137, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:13:26', 0, NULL, NULL),
(138, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:13:29', 0, NULL, NULL),
(139, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:13:32', 0, NULL, NULL),
(140, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:13:39', 0, NULL, NULL),
(141, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:13:45', 0, NULL, NULL),
(142, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:13:48', 0, NULL, NULL),
(143, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:13:51', 0, NULL, NULL),
(144, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:13:58', 0, NULL, NULL),
(145, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:14:04', 0, NULL, NULL),
(146, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:14:07', 0, NULL, NULL),
(147, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:14:13', 0, NULL, NULL),
(148, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:14:19', 0, NULL, NULL),
(149, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:14:20', 0, NULL, NULL),
(150, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:14:29', 0, NULL, NULL),
(151, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:14:32', 0, NULL, NULL),
(152, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:14:33', 0, NULL, NULL),
(153, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:14:42', 0, NULL, NULL),
(154, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:14:52', 0, NULL, NULL),
(155, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:14:55', 0, NULL, NULL),
(156, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:15:04', 0, NULL, NULL),
(157, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:15:08', 0, NULL, NULL),
(158, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:15:11', 0, NULL, NULL),
(159, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:15:12', 0, NULL, NULL),
(160, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:15:14', 0, NULL, NULL),
(161, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:15:17', 0, NULL, NULL),
(162, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:15:20', 0, NULL, NULL),
(163, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:15:24', 0, NULL, NULL),
(164, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:15:36', 0, NULL, NULL),
(165, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:15:39', 0, NULL, NULL),
(166, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:15:43', 0, NULL, NULL),
(167, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:15:49', 0, NULL, NULL),
(168, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:15:50', 0, NULL, NULL),
(169, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:15:58', 0, NULL, NULL),
(170, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:16:05', 0, NULL, NULL),
(171, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:16:11', 0, NULL, NULL),
(172, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:16:17', 0, NULL, NULL),
(173, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:16:20', 0, NULL, NULL),
(174, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:16:33', 0, NULL, NULL),
(175, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:16:40', 0, NULL, NULL),
(176, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:16:51', 0, NULL, NULL),
(177, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:16:52', 0, NULL, NULL),
(178, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:16:56', 0, NULL, NULL),
(179, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:17:02', 0, NULL, NULL),
(180, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:17:05', 0, NULL, NULL),
(181, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:17:27', 0, NULL, NULL),
(182, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:17:40', 0, NULL, NULL),
(183, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:17:50', 0, NULL, NULL),
(184, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:17:52', 0, NULL, NULL),
(185, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:17:56', 0, NULL, NULL),
(186, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:18:09', 0, NULL, NULL),
(187, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:18:10', 0, NULL, NULL),
(188, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:18:15', 0, NULL, NULL),
(189, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:18:21', 0, NULL, NULL),
(190, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:18:22', 0, NULL, NULL),
(191, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:18:31', 0, NULL, NULL),
(192, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:18:34', 0, NULL, NULL),
(193, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:18:37', 0, NULL, NULL),
(194, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:18:44', 0, NULL, NULL),
(195, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:18:47', 0, NULL, NULL),
(196, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:18:49', 0, NULL, NULL),
(197, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:19:03', 0, NULL, NULL),
(198, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:19:06', 0, NULL, NULL),
(199, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:19:19', 0, NULL, NULL),
(200, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:19:25', 0, NULL, NULL),
(201, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:19:29', 0, NULL, NULL),
(202, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:19:38', 0, NULL, NULL),
(203, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:19:44', 0, NULL, NULL),
(204, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:19:54', 0, NULL, NULL),
(205, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:20:00', 0, NULL, NULL),
(206, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:20:19', 0, NULL, NULL),
(207, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:20:21', 0, NULL, NULL),
(208, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:20:25', 0, NULL, NULL),
(209, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:20:33', 0, NULL, NULL),
(210, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:20:35', 0, NULL, NULL),
(211, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:20:42', 0, NULL, NULL),
(212, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:20:48', 0, NULL, NULL),
(213, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:20:51', 0, NULL, NULL),
(214, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:20:54', 0, NULL, NULL),
(215, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:20:57', 0, NULL, NULL),
(216, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:21:00', 0, NULL, NULL),
(217, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:21:07', 0, NULL, NULL),
(218, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:21:20', 0, NULL, NULL),
(219, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:21:21', 0, NULL, NULL),
(220, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:21:26', 0, NULL, NULL),
(221, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:21:34', 0, NULL, NULL),
(222, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:21:36', 0, NULL, NULL),
(223, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:21:45', 0, NULL, NULL),
(224, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:21:48', 0, NULL, NULL),
(225, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:21:48', 0, NULL, NULL),
(226, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:21:52', 0, NULL, NULL),
(227, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:21:55', 0, NULL, NULL),
(228, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:22:02', 0, NULL, NULL),
(229, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:22:07', 0, NULL, NULL),
(230, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:22:11', 0, NULL, NULL),
(231, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:22:17', 0, NULL, NULL),
(232, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:22:20', 0, NULL, NULL),
(233, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:22:22', 0, NULL, NULL),
(234, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:22:23', 0, NULL, NULL),
(235, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:22:34', 0, NULL, NULL),
(236, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:22:42', 0, NULL, NULL),
(237, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:22:46', 0, NULL, NULL),
(238, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:22:54', 0, NULL, NULL),
(239, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:22:56', 0, NULL, NULL),
(240, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:23:04', 0, NULL, NULL),
(241, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:23:11', 0, NULL, NULL),
(242, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:23:21', 0, NULL, NULL),
(243, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:23:22', 0, NULL, NULL),
(244, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:23:30', 0, NULL, NULL),
(245, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:23:33', 0, NULL, NULL),
(246, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:23:36', 0, NULL, NULL),
(247, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:23:42', 0, NULL, NULL),
(248, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:23:43', 0, NULL, NULL),
(249, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:23:49', 0, NULL, NULL),
(250, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:23:59', 0, NULL, NULL),
(251, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:24:02', 0, NULL, NULL),
(252, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:24:08', 0, NULL, NULL),
(253, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:24:22', 0, NULL, NULL),
(254, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:24:34', 0, NULL, NULL),
(255, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:24:50', 0, NULL, NULL),
(256, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:24:53', 0, NULL, NULL),
(257, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:24:56', 0, NULL, NULL),
(258, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:24:59', 0, NULL, NULL),
(259, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:25:03', 0, NULL, NULL),
(260, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:25:06', 0, NULL, NULL),
(261, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:25:11', 0, NULL, NULL),
(262, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:25:18', 0, NULL, NULL),
(263, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:25:22', 0, NULL, NULL),
(264, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:25:24', 0, NULL, NULL),
(265, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:25:25', 0, NULL, NULL),
(266, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:25:28', 0, NULL, NULL),
(267, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:25:31', 0, NULL, NULL),
(268, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:25:34', 0, NULL, NULL),
(269, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:25:53', 0, NULL, NULL),
(270, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:25:57', 0, NULL, NULL),
(271, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:26:06', 0, NULL, NULL),
(272, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:26:09', 0, NULL, NULL),
(273, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:26:14', 0, NULL, NULL),
(274, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:26:16', 0, NULL, NULL),
(275, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:26:23', 0, NULL, NULL),
(276, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:26:41', 0, NULL, NULL),
(277, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:26:44', 0, NULL, NULL),
(278, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:26:54', 0, NULL, NULL),
(279, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:27:00', 0, NULL, NULL),
(280, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:27:10', 0, NULL, NULL),
(281, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:27:26', 0, NULL, NULL),
(282, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:27:29', 0, NULL, NULL),
(283, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:27:38', 0, NULL, NULL),
(284, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:27:48', 0, NULL, NULL),
(285, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-10 16:28:04', 0, NULL, NULL),
(286, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:07:25', 0, NULL, NULL),
(287, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:07:31', 0, NULL, NULL),
(288, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:07:34', 0, NULL, NULL),
(289, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:07:47', 0, NULL, NULL),
(290, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:07:53', 0, NULL, NULL),
(291, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:07:59', 0, NULL, NULL),
(292, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:08:09', 0, NULL, NULL),
(293, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:08:22', 0, NULL, NULL),
(294, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:08:24', 0, NULL, NULL),
(295, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:08:25', 0, NULL, NULL),
(296, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:08:28', 0, NULL, NULL),
(297, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:08:37', 0, NULL, NULL),
(298, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:08:41', 0, NULL, NULL),
(299, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:08:42', 0, NULL, NULL),
(300, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:08:44', 0, NULL, NULL),
(301, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:08:50', 0, NULL, NULL),
(302, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:08:53', 0, NULL, NULL),
(303, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:09:03', 0, NULL, NULL),
(304, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:09:13', 0, NULL, NULL),
(305, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:09:21', 0, NULL, NULL),
(306, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:09:22', 0, NULL, NULL),
(307, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:09:31', 0, NULL, NULL),
(308, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:09:41', 0, NULL, NULL),
(309, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:09:42', 0, NULL, NULL),
(310, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:09:52', 0, NULL, NULL),
(311, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:09:57', 0, NULL, NULL),
(312, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:10:00', 0, NULL, NULL),
(313, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:10:06', 0, NULL, NULL),
(314, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:10:09', 0, NULL, NULL),
(315, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:10:16', 0, NULL, NULL),
(316, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:10:19', 0, NULL, NULL),
(317, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:10:25', 0, NULL, NULL),
(318, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:10:31', 0, NULL, NULL),
(319, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:10:41', 0, NULL, NULL),
(320, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:10:44', 0, NULL, NULL),
(321, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:10:51', 0, NULL, NULL),
(322, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:11:07', 0, NULL, NULL),
(323, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:11:19', 0, NULL, NULL),
(324, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2026-02-11 14:11:21', 0, NULL, NULL),
(335, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-11 14:12:15', 0, NULL, NULL),
(337, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:12:19', 0, NULL, NULL),
(338, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:12:23', 0, NULL, NULL),
(339, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:12:29', 0, NULL, NULL),
(340, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:12:35', 0, NULL, NULL),
(341, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:12:42', 0, NULL, NULL),
(342, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:12:48', 0, NULL, NULL),
(343, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:12:54', 0, NULL, NULL),
(344, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:13:01', 0, NULL, NULL),
(345, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:13:09', 0, NULL, NULL),
(346, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:13:10', 0, NULL, NULL),
(347, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:13:13', 0, NULL, NULL),
(348, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:13:23', 0, NULL, NULL),
(349, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:13:26', 0, NULL, NULL),
(350, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:13:29', 0, NULL, NULL),
(351, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:13:36', 0, NULL, NULL),
(352, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:13:42', 0, NULL, NULL),
(353, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:13:45', 0, NULL, NULL),
(354, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:13:52', 0, NULL, NULL),
(355, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:13:59', 0, NULL, NULL),
(356, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:14:04', 0, NULL, NULL),
(357, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:14:08', 0, NULL, NULL),
(358, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:14:17', 0, NULL, NULL),
(359, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:14:20', 0, NULL, NULL),
(360, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:14:23', 0, NULL, NULL),
(361, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:14:33', 0, NULL, NULL),
(362, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:14:43', 0, NULL, NULL),
(363, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:14:46', 0, NULL, NULL),
(364, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:14:54', 0, NULL, NULL),
(365, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:14:56', 0, NULL, NULL),
(366, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:15:02', 0, NULL, NULL),
(367, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:15:05', 0, NULL, NULL),
(368, 1, 1, 'door_opened', 'warning', 'Hlavne dvere otvorene', 0, '2026-02-11 14:15:08', 0, NULL, NULL),
(369, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:15:08', 0, NULL, NULL),
(370, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:15:15', 0, NULL, NULL),
(371, 1, 2, 'door_opened', 'warning', 'Okno obyvacka otvorene', 0, '2026-02-11 14:15:15', 0, NULL, NULL),
(372, 1, 2, 'door_closed', 'info', 'Okno obyvacka zatvorene', 0, '2026-02-11 14:15:15', 0, NULL, NULL),
(373, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:15:17', 0, NULL, NULL),
(374, 1, 2, 'door_opened', 'warning', 'Okno obyvacka otvorene', 0, '2026-02-11 14:15:20', 0, NULL, NULL),
(375, 1, 2, 'door_closed', 'info', 'Okno obyvacka zatvorene', 0, '2026-02-11 14:15:22', 0, NULL, NULL),
(376, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:15:22', 0, NULL, NULL),
(377, 1, 2, 'door_opened', 'warning', 'Okno obyvacka otvorene', 0, '2026-02-11 14:15:22', 0, NULL, NULL),
(378, 1, 2, 'door_closed', 'info', 'Okno obyvacka zatvorene', 0, '2026-02-11 14:15:23', 0, NULL, NULL),
(379, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:15:27', 0, NULL, NULL),
(380, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:15:27', 0, NULL, NULL),
(381, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:15:34', 0, NULL, NULL),
(382, 1, 1, 'door_closed', 'info', 'Hlavne dvere zatvorene', 0, '2026-02-11 14:15:37', 0, NULL, NULL),
(383, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:15:37', 0, NULL, NULL),
(384, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:15:43', 0, NULL, NULL),
(385, 1, 1, 'door_opened', 'warning', 'Hlavne dvere otvorene', 0, '2026-02-11 14:15:49', 0, NULL, NULL),
(386, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:15:49', 0, NULL, NULL),
(387, 1, 1, 'door_closed', 'info', 'Hlavne dvere zatvorene', 0, '2026-02-11 14:15:54', 0, NULL, NULL),
(388, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:15:54', 0, NULL, NULL),
(389, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:15:56', 0, NULL, NULL),
(390, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:15:59', 0, NULL, NULL),
(391, 1, 1, 'door_opened', 'warning', 'Hlavne dvere otvorene', 0, '2026-02-11 14:16:01', 0, NULL, NULL),
(392, 1, 1, 'door_closed', 'info', 'Hlavne dvere zatvorene', 0, '2026-02-11 14:16:02', 0, NULL, NULL),
(393, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:16:06', 0, NULL, NULL),
(394, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:16:11', 0, NULL, NULL),
(395, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:16:15', 0, NULL, NULL),
(396, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:16:21', 0, NULL, NULL),
(397, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:16:25', 0, NULL, NULL),
(398, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:16:30', 0, NULL, NULL),
(399, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:16:34', 0, NULL, NULL),
(400, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:16:37', 0, NULL, NULL),
(401, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:16:43', 0, NULL, NULL),
(402, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:16:53', 0, NULL, NULL),
(403, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:16:54', 0, NULL, NULL),
(404, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:16:55', 0, NULL, NULL),
(405, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:16:56', 0, NULL, NULL),
(406, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:17:02', 0, NULL, NULL),
(407, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:17:18', 0, NULL, NULL),
(408, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:17:28', 0, NULL, NULL),
(409, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:17:31', 0, NULL, NULL),
(410, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:17:33', 0, NULL, NULL),
(411, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:17:34', 0, NULL, NULL),
(412, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:17:43', 0, NULL, NULL),
(413, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:17:47', 0, NULL, NULL),
(414, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:17:50', 0, NULL, NULL),
(415, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:17:55', 0, NULL, NULL),
(416, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:17:59', 0, NULL, NULL),
(417, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:18:02', 0, NULL, NULL),
(418, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:18:05', 0, NULL, NULL),
(419, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:18:09', 0, NULL, NULL),
(420, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:18:15', 0, NULL, NULL),
(421, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:18:18', 0, NULL, NULL),
(422, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:18:24', 0, NULL, NULL),
(423, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:18:25', 0, NULL, NULL),
(424, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:18:31', 0, NULL, NULL),
(425, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:18:37', 0, NULL, NULL),
(426, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:18:43', 0, NULL, NULL),
(427, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:18:53', 0, NULL, NULL),
(428, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:19:02', 0, NULL, NULL),
(429, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:19:09', 0, NULL, NULL),
(430, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:19:12', 0, NULL, NULL),
(431, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:19:15', 0, NULL, NULL),
(432, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:19:17', 0, NULL, NULL),
(433, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:19:21', 0, NULL, NULL),
(434, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:19:24', 0, NULL, NULL),
(435, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:19:31', 0, NULL, NULL),
(436, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:19:34', 0, NULL, NULL),
(437, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:19:42', 0, NULL, NULL),
(438, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:19:47', 0, NULL, NULL),
(439, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:19:53', 0, NULL, NULL),
(440, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:19:56', 0, NULL, NULL),
(441, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:19:59', 0, NULL, NULL),
(442, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:20:06', 0, NULL, NULL),
(443, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:20:09', 0, NULL, NULL),
(444, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:20:15', 0, NULL, NULL),
(445, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:20:21', 0, NULL, NULL),
(446, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:20:25', 0, NULL, NULL),
(447, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:20:31', 0, NULL, NULL),
(448, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:20:37', 0, NULL, NULL),
(449, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:20:47', 0, NULL, NULL),
(450, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:20:53', 0, NULL, NULL),
(451, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:20:56', 0, NULL, NULL),
(452, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:21:00', 0, NULL, NULL),
(453, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:21:06', 0, NULL, NULL),
(454, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:21:16', 0, NULL, NULL),
(455, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:21:19', 0, NULL, NULL),
(456, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:21:26', 0, NULL, NULL),
(457, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:21:28', 0, NULL, NULL),
(458, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:21:32', 0, NULL, NULL),
(459, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:21:38', 0, NULL, NULL),
(460, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:21:47', 0, NULL, NULL),
(461, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:21:51', 0, NULL, NULL),
(462, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:21:56', 0, NULL, NULL),
(463, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:22:03', 0, NULL, NULL),
(464, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:22:13', 0, NULL, NULL),
(465, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:22:22', 0, NULL, NULL),
(466, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:22:29', 0, NULL, NULL),
(467, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:22:35', 0, NULL, NULL),
(468, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:22:38', 0, NULL, NULL),
(469, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:22:54', 0, NULL, NULL),
(470, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:22:57', 0, NULL, NULL),
(471, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:23:03', 0, NULL, NULL);
INSERT INTO `events` (`id`, `household_id`, `sensor_id`, `event_type`, `severity`, `description`, `triggered_buzzer`, `timestamp`, `acknowledged`, `acknowledged_by`, `acknowledged_at`) VALUES
(472, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:23:07', 0, NULL, NULL),
(473, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:23:13', 0, NULL, NULL),
(474, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:23:16', 0, NULL, NULL),
(475, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:23:19', 0, NULL, NULL),
(476, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:23:22', 0, NULL, NULL),
(477, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:23:30', 0, NULL, NULL),
(478, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:23:38', 0, NULL, NULL),
(479, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:23:45', 0, NULL, NULL),
(480, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:23:51', 0, NULL, NULL),
(481, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:23:57', 0, NULL, NULL),
(482, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:24:04', 0, NULL, NULL),
(483, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:24:10', 0, NULL, NULL),
(484, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:24:16', 0, NULL, NULL),
(485, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:24:23', 0, NULL, NULL),
(486, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:24:26', 0, NULL, NULL),
(487, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:24:29', 0, NULL, NULL),
(488, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:24:32', 0, NULL, NULL),
(489, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:24:54', 0, NULL, NULL),
(490, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:24:57', 0, NULL, NULL),
(491, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:25:07', 0, NULL, NULL),
(492, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:25:11', 0, NULL, NULL),
(493, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:25:14', 0, NULL, NULL),
(494, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:25:17', 0, NULL, NULL),
(495, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:25:23', 0, NULL, NULL),
(496, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:25:27', 0, NULL, NULL),
(497, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:25:52', 0, NULL, NULL),
(498, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:25:58', 0, NULL, NULL),
(499, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:26:05', 0, NULL, NULL),
(500, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:26:08', 0, NULL, NULL),
(501, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:26:12', 0, NULL, NULL),
(502, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:26:18', 0, NULL, NULL),
(503, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:26:28', 0, NULL, NULL),
(504, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:26:34', 0, NULL, NULL),
(505, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:26:41', 0, NULL, NULL),
(506, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:26:44', 0, NULL, NULL),
(507, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:26:47', 0, NULL, NULL),
(508, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:26:50', 0, NULL, NULL),
(509, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:26:58', 0, NULL, NULL),
(510, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:27:00', 0, NULL, NULL),
(511, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:27:06', 0, NULL, NULL),
(512, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:27:09', 0, NULL, NULL),
(513, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:27:16', 0, NULL, NULL),
(514, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:27:19', 0, NULL, NULL),
(515, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:27:28', 0, NULL, NULL),
(516, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:27:29', 0, NULL, NULL),
(517, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:27:32', 0, NULL, NULL),
(518, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:27:41', 0, NULL, NULL),
(519, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:27:44', 0, NULL, NULL),
(520, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:27:51', 0, NULL, NULL),
(521, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:27:54', 0, NULL, NULL),
(522, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:27:58', 0, NULL, NULL),
(523, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:28:00', 0, NULL, NULL),
(524, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:28:04', 0, NULL, NULL),
(525, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:28:10', 0, NULL, NULL),
(526, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:28:19', 0, NULL, NULL),
(527, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:28:26', 0, NULL, NULL),
(528, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:28:32', 0, NULL, NULL),
(529, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:28:35', 0, NULL, NULL),
(530, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:28:38', 0, NULL, NULL),
(531, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:28:48', 0, NULL, NULL),
(532, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:28:51', 0, NULL, NULL),
(533, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:28:54', 0, NULL, NULL),
(534, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:28:59', 0, NULL, NULL),
(535, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:29:07', 0, NULL, NULL),
(536, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:29:13', 0, NULL, NULL),
(537, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:29:20', 0, NULL, NULL),
(538, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:29:23', 0, NULL, NULL),
(539, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:29:29', 0, NULL, NULL),
(540, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:29:35', 0, NULL, NULL),
(541, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:29:50', 0, NULL, NULL),
(542, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:29:57', 0, NULL, NULL),
(543, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:30:03', 0, NULL, NULL),
(544, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:30:16', 0, NULL, NULL),
(545, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:30:22', 0, NULL, NULL),
(546, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:30:29', 0, NULL, NULL),
(547, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:30:38', 0, NULL, NULL),
(548, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:30:44', 0, NULL, NULL),
(549, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:30:48', 0, NULL, NULL),
(550, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:30:51', 0, NULL, NULL),
(551, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:30:54', 0, NULL, NULL),
(552, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:31:04', 0, NULL, NULL),
(553, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:31:08', 0, NULL, NULL),
(554, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:31:20', 0, NULL, NULL),
(555, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:31:24', 0, NULL, NULL),
(556, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:31:30', 0, NULL, NULL),
(557, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:31:36', 0, NULL, NULL),
(558, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:31:43', 0, NULL, NULL),
(559, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:32:18', 0, NULL, NULL),
(560, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:32:21', 0, NULL, NULL),
(561, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:32:24', 0, NULL, NULL),
(562, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:32:27', 0, NULL, NULL),
(563, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:32:37', 0, NULL, NULL),
(564, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:32:39', 0, NULL, NULL),
(565, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:32:43', 0, NULL, NULL),
(566, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:32:45', 0, NULL, NULL),
(567, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:32:50', 0, NULL, NULL),
(568, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:32:53', 0, NULL, NULL),
(569, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:33:03', 0, NULL, NULL),
(570, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:33:15', 0, NULL, NULL),
(571, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:33:21', 0, NULL, NULL),
(572, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:33:27', 0, NULL, NULL),
(573, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:33:30', 0, NULL, NULL),
(574, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:33:33', 0, NULL, NULL),
(575, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:33:43', 0, NULL, NULL),
(576, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:33:45', 0, NULL, NULL),
(577, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:33:49', 0, NULL, NULL),
(578, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:33:56', 0, NULL, NULL),
(579, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:34:05', 0, NULL, NULL),
(580, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:34:15', 0, NULL, NULL),
(581, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:34:18', 0, NULL, NULL),
(582, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:34:27', 0, NULL, NULL),
(583, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:34:30', 0, NULL, NULL),
(584, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:34:37', 0, NULL, NULL),
(585, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:34:40', 0, NULL, NULL),
(586, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:34:46', 0, NULL, NULL),
(587, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:34:50', 0, NULL, NULL),
(588, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:34:53', 0, NULL, NULL),
(589, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:35:02', 0, NULL, NULL),
(590, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:35:06', 0, NULL, NULL),
(591, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:35:12', 0, NULL, NULL),
(592, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:35:16', 0, NULL, NULL),
(593, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:35:37', 0, NULL, NULL),
(594, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:35:46', 0, NULL, NULL),
(595, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:35:47', 0, NULL, NULL),
(596, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:35:56', 0, NULL, NULL),
(597, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:36:00', 0, NULL, NULL),
(598, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:36:09', 0, NULL, NULL),
(599, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:36:12', 0, NULL, NULL),
(600, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:36:15', 0, NULL, NULL),
(601, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:36:19', 0, NULL, NULL),
(602, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:36:25', 0, NULL, NULL),
(603, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:36:31', 0, NULL, NULL),
(604, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:36:47', 0, NULL, NULL),
(605, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:36:50', 0, NULL, NULL),
(606, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:36:57', 0, NULL, NULL),
(607, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:37:07', 0, NULL, NULL),
(608, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:37:16', 0, NULL, NULL),
(609, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:37:20', 0, NULL, NULL),
(610, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:37:22', 0, NULL, NULL),
(611, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2026-02-11 14:37:24', 0, NULL, NULL),
(612, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-11 14:37:26', 0, NULL, NULL),
(613, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:37:29', 0, NULL, NULL),
(614, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:37:32', 0, NULL, NULL),
(615, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:37:39', 0, NULL, NULL),
(616, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:37:42', 0, NULL, NULL),
(617, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:37:45', 0, NULL, NULL),
(618, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:37:54', 0, NULL, NULL),
(619, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:38:01', 0, NULL, NULL),
(620, 1, 1, 'door_opened', 'warning', 'Hlavne dvere otvorene', 0, '2026-02-11 14:38:01', 1, 1, '2026-02-11 14:40:48'),
(621, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:38:04', 0, NULL, NULL),
(622, 1, 1, 'door_closed', 'info', 'Hlavne dvere zatvorene', 0, '2026-02-11 14:38:05', 0, NULL, NULL),
(623, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2026-02-11 14:38:11', 0, NULL, NULL),
(630, 1, 1, 'door_closed', 'info', 'Hlavne dvere zatvorene', 0, '2026-02-11 14:38:17', 0, NULL, NULL),
(653, 1, NULL, 'other', 'info', 'Bzučiak vypnutý používateľom Peter Kováč', 0, '2026-02-11 14:39:29', 0, NULL, NULL),
(657, 1, NULL, 'other', 'info', 'Bzučiak vypnutý používateľom Peter Kováč', 0, '2026-02-11 14:39:36', 0, NULL, NULL),
(685, 1, NULL, 'other', 'info', 'Bzučiak vypnutý používateľom Peter Kováč', 0, '2026-02-11 14:40:35', 0, NULL, NULL),
(690, 1, 1, 'door_closed', 'info', 'Hlavne dvere zatvorene', 0, '2026-02-11 14:40:44', 0, NULL, NULL),
(697, 1, NULL, 'other', 'info', 'Bzučiak vypnutý používateľom Peter Kováč', 0, '2026-02-11 14:40:58', 0, NULL, NULL),
(698, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-11 14:41:01', 0, NULL, NULL),
(699, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:41:01', 0, NULL, NULL),
(700, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:41:10', 0, NULL, NULL),
(701, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:41:14', 0, NULL, NULL),
(702, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:41:18', 0, NULL, NULL),
(703, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:41:30', 0, NULL, NULL),
(704, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:41:31', 0, NULL, NULL),
(705, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:41:40', 0, NULL, NULL),
(706, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:41:43', 0, NULL, NULL),
(707, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:41:57', 0, NULL, NULL),
(708, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:42:00', 0, NULL, NULL),
(709, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:42:10', 0, NULL, NULL),
(710, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:42:17', 0, NULL, NULL),
(711, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:42:37', 0, NULL, NULL),
(712, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:42:40', 0, NULL, NULL),
(713, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:42:43', 0, NULL, NULL),
(714, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:42:46', 0, NULL, NULL),
(715, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:42:55', 0, NULL, NULL),
(716, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:43:02', 0, NULL, NULL),
(717, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:43:11', 0, NULL, NULL),
(718, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:43:21', 0, NULL, NULL),
(719, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:43:30', 0, NULL, NULL),
(720, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:43:33', 0, NULL, NULL),
(721, 1, 1, 'door_opened', 'warning', 'Hlavne dvere otvorene', 0, '2026-02-11 14:43:36', 0, NULL, NULL),
(722, 1, 1, 'door_closed', 'info', 'Hlavne dvere zatvorene', 0, '2026-02-11 14:43:37', 0, NULL, NULL),
(723, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2026-02-11 14:43:37', 0, NULL, NULL),
(724, 1, 1, 'door_opened', 'warning', 'Hlavne dvere otvorene', 0, '2026-02-11 14:43:38', 0, NULL, NULL),
(727, 1, 1, 'door_closed', 'info', 'Hlavne dvere zatvorene', 0, '2026-02-11 14:43:41', 0, NULL, NULL),
(764, 1, NULL, 'other', 'info', 'Bzučiak vypnutý používateľom Peter Kováč', 0, '2026-02-11 14:45:20', 0, NULL, NULL),
(768, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-11 14:45:27', 0, NULL, NULL),
(770, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:45:29', 0, NULL, NULL),
(771, 1, NULL, 'other', 'info', 'Bzučiak vypnutý používateľom Peter Kováč', 0, '2026-02-11 14:45:32', 0, NULL, NULL),
(772, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:45:40', 0, NULL, NULL),
(773, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:45:45', 0, NULL, NULL),
(774, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:45:49', 0, NULL, NULL),
(775, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:45:51', 0, NULL, NULL),
(776, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:45:55', 0, NULL, NULL),
(777, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:46:01', 0, NULL, NULL),
(778, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:46:07', 0, NULL, NULL),
(779, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:46:14', 0, NULL, NULL),
(780, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:46:20', 0, NULL, NULL),
(781, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:46:26', 0, NULL, NULL),
(782, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:46:33', 0, NULL, NULL),
(783, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:46:49', 0, NULL, NULL),
(784, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:46:58', 0, NULL, NULL),
(785, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:47:04', 0, NULL, NULL),
(786, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:47:11', 0, NULL, NULL),
(787, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:47:20', 0, NULL, NULL),
(788, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:47:30', 0, NULL, NULL),
(789, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:47:33', 0, NULL, NULL),
(790, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:47:36', 0, NULL, NULL),
(791, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:47:41', 0, NULL, NULL),
(792, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:47:43', 0, NULL, NULL),
(793, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:47:50', 0, NULL, NULL),
(794, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:47:58', 0, NULL, NULL),
(795, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:48:02', 0, NULL, NULL),
(796, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:48:05', 0, NULL, NULL),
(797, 1, 2, 'door_opened', 'warning', 'Okno obyvacka otvorene', 0, '2026-02-11 14:48:05', 0, NULL, NULL),
(798, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:48:05', 0, NULL, NULL),
(799, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:48:08', 0, NULL, NULL),
(800, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:48:11', 0, NULL, NULL),
(801, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:48:20', 0, NULL, NULL),
(802, 1, 2, 'door_closed', 'info', 'Okno obyvacka zatvorene', 0, '2026-02-11 14:48:23', 0, NULL, NULL),
(803, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:48:30', 0, NULL, NULL),
(804, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:48:37', 0, NULL, NULL),
(805, 1, 2, 'door_opened', 'warning', 'Okno obyvacka otvorene', 0, '2026-02-11 14:48:37', 0, NULL, NULL),
(806, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:48:40', 0, NULL, NULL),
(807, 1, 2, 'door_closed', 'info', 'Okno obyvacka zatvorene', 0, '2026-02-11 14:48:41', 0, NULL, NULL),
(808, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2026-02-11 14:48:45', 0, NULL, NULL),
(811, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-11 14:48:47', 0, NULL, NULL),
(812, 1, NULL, 'other', 'info', 'Bzučiak vypnutý používateľom Peter Kováč', 0, '2026-02-11 14:48:49', 0, NULL, NULL),
(814, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:48:56', 0, NULL, NULL),
(815, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:49:12', 0, NULL, NULL),
(816, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:49:15', 0, NULL, NULL),
(817, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:49:24', 0, NULL, NULL),
(818, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:49:27', 0, NULL, NULL),
(819, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:49:30', 0, NULL, NULL),
(820, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:49:43', 0, NULL, NULL),
(821, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:49:46', 0, NULL, NULL),
(822, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:49:50', 0, NULL, NULL),
(823, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:49:53', 0, NULL, NULL),
(824, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:49:59', 0, NULL, NULL),
(825, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:51:39', 0, NULL, NULL),
(826, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:51:42', 0, NULL, NULL),
(827, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:51:48', 0, NULL, NULL),
(828, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:52:01', 0, NULL, NULL),
(829, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:52:04', 0, NULL, NULL),
(830, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:52:07', 0, NULL, NULL),
(831, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:52:11', 0, NULL, NULL),
(832, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:52:14', 0, NULL, NULL),
(833, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:52:17', 0, NULL, NULL),
(834, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:52:20', 0, NULL, NULL),
(835, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:52:30', 0, NULL, NULL),
(836, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:52:30', 0, NULL, NULL),
(837, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:52:36', 0, NULL, NULL),
(838, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:52:42', 0, NULL, NULL),
(839, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:52:45', 0, NULL, NULL),
(840, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:52:55', 0, NULL, NULL),
(841, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:53:01', 0, NULL, NULL),
(842, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:53:07', 0, NULL, NULL),
(843, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:53:08', 0, NULL, NULL),
(844, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:53:08', 0, NULL, NULL),
(845, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:53:11', 0, NULL, NULL),
(846, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:53:20', 0, NULL, NULL),
(847, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:53:24', 0, NULL, NULL),
(848, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:53:36', 0, NULL, NULL),
(849, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:53:36', 0, NULL, NULL),
(850, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:53:41', 0, NULL, NULL),
(851, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:53:46', 0, NULL, NULL),
(852, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:53:52', 0, NULL, NULL),
(853, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:53:56', 0, NULL, NULL),
(854, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:53:58', 0, NULL, NULL),
(855, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:54:05', 0, NULL, NULL),
(856, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:54:08', 0, NULL, NULL),
(857, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:54:11', 0, NULL, NULL),
(858, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:54:14', 0, NULL, NULL),
(859, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:54:17', 0, NULL, NULL),
(860, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:54:24', 0, NULL, NULL),
(861, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:54:27', 0, NULL, NULL),
(862, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:54:31', 0, NULL, NULL),
(863, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:54:33', 0, NULL, NULL),
(864, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:54:40', 0, NULL, NULL),
(865, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:54:46', 0, NULL, NULL),
(866, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:54:54', 0, NULL, NULL),
(867, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:54:55', 0, NULL, NULL),
(868, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:54:59', 0, NULL, NULL),
(869, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:55:05', 0, NULL, NULL),
(870, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:55:18', 0, NULL, NULL),
(871, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:55:21', 0, NULL, NULL),
(872, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:55:30', 0, NULL, NULL),
(873, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:55:35', 0, NULL, NULL),
(874, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:55:52', 0, NULL, NULL),
(875, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:56:02', 0, NULL, NULL),
(876, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:56:08', 0, NULL, NULL),
(877, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:56:08', 0, NULL, NULL),
(878, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:56:21', 0, NULL, NULL),
(879, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:56:27', 0, NULL, NULL),
(880, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:56:40', 0, NULL, NULL),
(881, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:56:46', 0, NULL, NULL),
(882, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:56:49', 0, NULL, NULL),
(883, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:57:05', 0, NULL, NULL),
(884, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:57:08', 0, NULL, NULL),
(885, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:57:15', 0, NULL, NULL),
(886, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:57:27', 0, NULL, NULL),
(887, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:57:34', 0, NULL, NULL),
(888, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:57:40', 0, NULL, NULL),
(889, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:57:49', 0, NULL, NULL),
(890, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:57:53', 0, NULL, NULL),
(891, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 14:57:59', 0, NULL, NULL),
(892, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:01:22', 0, NULL, NULL),
(893, 1, 1, 'door_opened', 'warning', 'Hlavne dvere otvorene', 0, '2026-02-11 15:03:50', 0, NULL, NULL),
(894, 1, 1, 'door_closed', 'info', 'Hlavne dvere zatvorene', 0, '2026-02-11 15:03:54', 0, NULL, NULL),
(895, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2026-02-11 15:04:04', 0, NULL, NULL),
(900, 1, 1, 'door_closed', 'info', 'Hlavne dvere zatvorene', 0, '2026-02-11 15:04:21', 0, NULL, NULL),
(904, 1, NULL, 'other', 'info', 'Bzučiak vypnutý používateľom Peter Kováč', 0, '2026-02-11 15:04:40', 0, NULL, NULL),
(917, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-11 15:06:59', 0, NULL, NULL),
(918, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:07:00', 0, NULL, NULL),
(919, 1, NULL, 'other', 'info', 'Bzučiak vypnutý používateľom Peter Kováč', 0, '2026-02-11 15:07:00', 0, NULL, NULL),
(920, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:07:07', 0, NULL, NULL),
(921, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:07:09', 0, NULL, NULL),
(922, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:07:10', 0, NULL, NULL),
(923, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:07:16', 0, NULL, NULL),
(924, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:07:26', 0, NULL, NULL),
(925, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:07:29', 0, NULL, NULL),
(926, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:07:31', 0, NULL, NULL),
(927, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:07:32', 0, NULL, NULL),
(928, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:07:36', 0, NULL, NULL),
(929, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:07:42', 0, NULL, NULL),
(930, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:07:48', 0, NULL, NULL),
(931, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:07:54', 0, NULL, NULL),
(932, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:07:59', 0, NULL, NULL),
(933, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:08', 0, NULL, NULL),
(934, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:11', 0, NULL, NULL),
(935, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:14', 0, NULL, NULL),
(936, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:17', 0, NULL, NULL),
(937, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:23', 0, NULL, NULL),
(938, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:27', 0, NULL, NULL),
(939, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:28', 0, NULL, NULL),
(940, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:30', 0, NULL, NULL),
(941, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:30', 0, NULL, NULL),
(942, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:33', 0, NULL, NULL),
(943, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:36', 0, NULL, NULL),
(944, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:38', 0, NULL, NULL),
(945, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:39', 0, NULL, NULL),
(946, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:42', 0, NULL, NULL),
(947, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:46', 0, NULL, NULL),
(948, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:47', 0, NULL, NULL),
(949, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:49', 0, NULL, NULL),
(950, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:55', 0, NULL, NULL),
(951, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:08:58', 0, NULL, NULL),
(952, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:09:05', 0, NULL, NULL),
(953, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:09:11', 0, NULL, NULL),
(954, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:09:17', 0, NULL, NULL),
(955, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:09:27', 0, NULL, NULL),
(956, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:09:37', 0, NULL, NULL),
(957, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:09:40', 0, NULL, NULL),
(958, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:09:43', 0, NULL, NULL),
(959, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:09:46', 0, NULL, NULL),
(960, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:09:52', 0, NULL, NULL),
(961, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:09:59', 0, NULL, NULL),
(962, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:10:02', 0, NULL, NULL),
(963, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:10:04', 0, NULL, NULL),
(964, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:10:05', 0, NULL, NULL),
(965, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:10:06', 0, NULL, NULL),
(966, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:10:08', 0, NULL, NULL),
(967, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:10:12', 0, NULL, NULL),
(968, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:10:15', 0, NULL, NULL),
(969, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:10:24', 0, NULL, NULL),
(970, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:10:31', 0, NULL, NULL),
(971, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:10:34', 0, NULL, NULL),
(972, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:10:40', 0, NULL, NULL),
(973, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:10:42', 0, NULL, NULL),
(974, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:10:44', 0, NULL, NULL),
(975, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:10:46', 0, NULL, NULL),
(976, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:10:53', 0, NULL, NULL),
(977, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:10:56', 0, NULL, NULL),
(978, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:11:06', 0, NULL, NULL),
(979, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:11:15', 0, NULL, NULL),
(980, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:11:18', 0, NULL, NULL),
(981, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:11:21', 0, NULL, NULL),
(982, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:11:28', 0, NULL, NULL),
(983, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:11:34', 0, NULL, NULL),
(984, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:11:41', 0, NULL, NULL),
(985, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:11:44', 0, NULL, NULL),
(986, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:11:47', 0, NULL, NULL),
(987, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:11:53', 0, NULL, NULL),
(988, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:12:04', 0, NULL, NULL),
(989, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:12:12', 0, NULL, NULL),
(990, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:12:15', 0, NULL, NULL),
(991, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:12:19', 0, NULL, NULL),
(992, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:12:25', 0, NULL, NULL),
(993, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:12:28', 0, NULL, NULL),
(994, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:12:31', 0, NULL, NULL),
(995, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:12:38', 0, NULL, NULL),
(996, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:12:41', 0, NULL, NULL),
(997, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:12:43', 0, NULL, NULL),
(998, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:12:44', 0, NULL, NULL),
(999, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:12:50', 0, NULL, NULL),
(1000, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:13:03', 0, NULL, NULL),
(1001, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:13:10', 0, NULL, NULL),
(1002, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:13:13', 0, NULL, NULL),
(1003, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:13:19', 0, NULL, NULL),
(1004, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:13:23', 0, NULL, NULL),
(1005, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:13:29', 0, NULL, NULL),
(1006, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:13:32', 0, NULL, NULL),
(1007, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:13:35', 0, NULL, NULL),
(1008, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:13:38', 0, NULL, NULL),
(1009, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:13:45', 0, NULL, NULL),
(1010, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:13:48', 0, NULL, NULL),
(1011, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:13:54', 0, NULL, NULL),
(1012, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:13:57', 0, NULL, NULL),
(1013, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:14:01', 0, NULL, NULL),
(1014, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:14:04', 0, NULL, NULL),
(1015, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:14:07', 0, NULL, NULL),
(1016, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:14:10', 0, NULL, NULL),
(1017, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:14:20', 0, NULL, NULL),
(1018, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:14:32', 0, NULL, NULL),
(1019, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:14:39', 0, NULL, NULL),
(1020, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:14:48', 0, NULL, NULL),
(1021, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:14:58', 0, NULL, NULL),
(1022, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:15:01', 0, NULL, NULL),
(1023, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:15:07', 0, NULL, NULL),
(1024, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:15:10', 0, NULL, NULL),
(1025, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:15:14', 0, NULL, NULL),
(1026, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:15:17', 0, NULL, NULL),
(1027, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:15:29', 0, NULL, NULL),
(1028, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:15:33', 0, NULL, NULL),
(1029, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:15:42', 0, NULL, NULL),
(1030, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:15:45', 0, NULL, NULL),
(1031, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:15:48', 0, NULL, NULL),
(1032, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:16:01', 0, NULL, NULL),
(1033, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:16:07', 0, NULL, NULL),
(1034, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:16:14', 0, NULL, NULL),
(1035, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:16:18', 0, NULL, NULL),
(1036, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:16:23', 0, NULL, NULL),
(1037, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:16:26', 0, NULL, NULL),
(1038, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:16:32', 0, NULL, NULL),
(1039, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:16:36', 0, NULL, NULL),
(1040, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:16:42', 0, NULL, NULL),
(1041, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:16:49', 0, NULL, NULL),
(1042, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:16:55', 0, NULL, NULL),
(1043, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:17:01', 0, NULL, NULL),
(1044, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:17:08', 0, NULL, NULL),
(1045, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:17:21', 0, NULL, NULL),
(1046, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:17:27', 0, NULL, NULL),
(1047, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:17:33', 0, NULL, NULL),
(1048, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:17:55', 0, NULL, NULL),
(1049, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2026-02-11 15:18:08', 0, NULL, NULL),
(1050, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-11 15:18:41', 0, NULL, NULL),
(1051, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:18:56', 0, NULL, NULL),
(1052, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:19:02', 0, NULL, NULL),
(1053, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:19:06', 0, NULL, NULL),
(1054, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:19:12', 0, NULL, NULL),
(1055, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:19:15', 0, NULL, NULL),
(1056, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:19:19', 0, NULL, NULL),
(1057, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:19:22', 0, NULL, NULL),
(1058, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:19:25', 0, NULL, NULL),
(1059, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:19:31', 0, NULL, NULL);
INSERT INTO `events` (`id`, `household_id`, `sensor_id`, `event_type`, `severity`, `description`, `triggered_buzzer`, `timestamp`, `acknowledged`, `acknowledged_by`, `acknowledged_at`) VALUES
(1060, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:19:44', 0, NULL, NULL),
(1061, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:19:45', 0, NULL, NULL),
(1062, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:20:00', 0, NULL, NULL),
(1063, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:20:03', 0, NULL, NULL),
(1064, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:20:13', 0, NULL, NULL),
(1065, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:20:15', 0, NULL, NULL),
(1066, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:20:35', 0, NULL, NULL),
(1067, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2026-02-11 15:20:48', 0, NULL, NULL),
(1082, 1, NULL, 'other', 'info', 'Bzučiak vypnutý používateľom Peter Kováč', 0, '2026-02-11 15:22:36', 0, NULL, NULL),
(1087, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-11 15:22:48', 0, NULL, NULL),
(1088, 1, 4, 'motion_detected', 'alert', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:22:48', 0, NULL, NULL),
(1091, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:22:56', 0, NULL, NULL),
(1092, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:23:04', 0, NULL, NULL),
(1093, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:23:16', 0, NULL, NULL),
(1094, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:23:22', 0, NULL, NULL),
(1095, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:23:33', 0, NULL, NULL),
(1096, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:23:40', 0, NULL, NULL),
(1097, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:23:48', 0, NULL, NULL),
(1098, 1, NULL, 'other', 'info', 'Bzučiak vypnutý používateľom Peter Kováč', 0, '2026-02-11 15:23:49', 0, NULL, NULL),
(1099, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:23:56', 0, NULL, NULL),
(1100, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:24:03', 0, NULL, NULL),
(1101, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:24:15', 0, NULL, NULL),
(1102, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:24:22', 0, NULL, NULL),
(1103, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:24:31', 0, NULL, NULL),
(1104, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:24:39', 0, NULL, NULL),
(1105, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:24:46', 0, NULL, NULL),
(1106, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:24:54', 0, NULL, NULL),
(1107, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:25:03', 0, NULL, NULL),
(1108, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:25:13', 0, NULL, NULL),
(1109, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:25:26', 0, NULL, NULL),
(1110, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:25:33', 0, NULL, NULL),
(1111, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:25:41', 0, NULL, NULL),
(1112, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:25:52', 0, NULL, NULL),
(1113, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:26:04', 0, NULL, NULL),
(1114, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:26:23', 0, NULL, NULL),
(1115, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:26:30', 0, NULL, NULL),
(1116, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:26:40', 0, NULL, NULL),
(1117, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:26:48', 0, NULL, NULL),
(1118, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:27:01', 0, NULL, NULL),
(1119, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:27:11', 0, NULL, NULL),
(1120, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:27:21', 0, NULL, NULL),
(1121, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:27:33', 0, NULL, NULL),
(1122, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:27:42', 0, NULL, NULL),
(1123, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:27:52', 0, NULL, NULL),
(1124, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2026-02-11 15:28:23', 0, NULL, NULL),
(1140, 1, NULL, 'other', 'info', 'Bzučiak vypnutý používateľom Peter Kováč', 0, '2026-02-11 15:32:21', 0, NULL, NULL),
(1149, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-11 15:32:58', 0, NULL, NULL),
(1151, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:33:05', 0, NULL, NULL),
(1152, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:33:08', 0, NULL, NULL),
(1153, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:33:11', 0, NULL, NULL),
(1154, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:33:14', 0, NULL, NULL),
(1155, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:33:20', 0, NULL, NULL),
(1156, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:33:27', 0, NULL, NULL),
(1157, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:33:30', 0, NULL, NULL),
(1158, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:33:40', 0, NULL, NULL),
(1159, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:33:50', 0, NULL, NULL),
(1160, 1, NULL, 'other', 'info', 'Bzučiak vypnutý používateľom Peter Kováč', 0, '2026-02-11 15:34:03', 0, NULL, NULL),
(1161, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:35:10', 0, NULL, NULL),
(1162, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:35:29', 0, NULL, NULL),
(1163, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:35:33', 0, NULL, NULL),
(1164, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:35:34', 0, NULL, NULL),
(1165, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:36:19', 0, NULL, NULL),
(1166, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:36:30', 0, NULL, NULL),
(1167, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:36:53', 0, NULL, NULL),
(1168, 1, NULL, 'alarm_activated', 'info', 'Alarm bol aktivovaný', 0, '2026-02-11 15:37:29', 0, NULL, NULL),
(1172, 1, 1, 'door_closed', 'info', 'Hlavne dvere zatvorene', 0, '2026-02-11 15:38:09', 0, NULL, NULL),
(1176, 1, 1, 'door_closed', 'info', 'Hlavne dvere zatvorene', 0, '2026-02-11 15:38:43', 0, NULL, NULL),
(1183, 1, NULL, 'alarm_deactivated', 'info', 'Alarm bol deaktivovaný', 0, '2026-02-11 15:47:43', 0, NULL, NULL),
(1184, 1, NULL, 'other', 'info', 'Bzučiak vypnutý používateľom Peter Kováč', 0, '2026-02-11 15:47:45', 0, NULL, NULL),
(1185, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:47:53', 0, NULL, NULL),
(1186, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:47:53', 0, NULL, NULL),
(1187, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:48:01', 0, NULL, NULL),
(1188, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:48:05', 0, NULL, NULL),
(1189, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:48:09', 0, NULL, NULL),
(1190, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:48:12', 0, NULL, NULL),
(1191, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:48:18', 0, NULL, NULL),
(1192, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:48:27', 0, NULL, NULL),
(1193, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:48:31', 0, NULL, NULL),
(1194, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:48:34', 0, NULL, NULL),
(1195, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:48:37', 0, NULL, NULL),
(1196, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:48:39', 0, NULL, NULL),
(1197, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:48:40', 0, NULL, NULL),
(1198, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:48:53', 0, NULL, NULL),
(1199, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:48:56', 0, NULL, NULL),
(1200, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:48:58', 0, NULL, NULL),
(1201, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:48:59', 0, NULL, NULL),
(1202, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:49:09', 0, NULL, NULL),
(1203, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:49:12', 0, NULL, NULL),
(1204, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:49:18', 0, NULL, NULL),
(1205, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:49:25', 0, NULL, NULL),
(1206, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:49:29', 0, NULL, NULL),
(1207, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:49:31', 0, NULL, NULL),
(1208, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:49:37', 0, NULL, NULL),
(1209, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:49:44', 0, NULL, NULL),
(1210, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:49:47', 0, NULL, NULL),
(1211, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:49:51', 0, NULL, NULL),
(1212, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:49:54', 0, NULL, NULL),
(1213, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:50:00', 0, NULL, NULL),
(1214, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:50:06', 0, NULL, NULL),
(1215, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:50:15', 0, NULL, NULL),
(1216, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:50:18', 0, NULL, NULL),
(1217, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:50:21', 0, NULL, NULL),
(1218, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:50:28', 0, NULL, NULL),
(1219, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:50:31', 0, NULL, NULL),
(1220, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:50:37', 0, NULL, NULL),
(1221, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:50:44', 0, NULL, NULL),
(1222, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:50:54', 0, NULL, NULL),
(1223, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:50:56', 0, NULL, NULL),
(1224, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:50:58', 0, NULL, NULL),
(1225, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:51:03', 0, NULL, NULL),
(1226, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:51:06', 0, NULL, NULL),
(1227, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:51:12', 0, NULL, NULL),
(1228, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:51:15', 0, NULL, NULL),
(1229, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:51:22', 0, NULL, NULL),
(1230, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:51:25', 0, NULL, NULL),
(1231, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:51:28', 0, NULL, NULL),
(1232, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:51:28', 0, NULL, NULL),
(1233, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:51:36', 0, NULL, NULL),
(1234, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:51:38', 0, NULL, NULL),
(1235, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:51:44', 0, NULL, NULL),
(1236, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:51:47', 0, NULL, NULL),
(1237, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:51:54', 0, NULL, NULL),
(1238, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:52:03', 0, NULL, NULL),
(1239, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:52:06', 0, NULL, NULL),
(1240, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:52:10', 0, NULL, NULL),
(1241, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:52:16', 0, NULL, NULL),
(1242, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:52:22', 0, NULL, NULL),
(1243, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:52:25', 0, NULL, NULL),
(1244, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:52:29', 0, NULL, NULL),
(1245, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:52:32', 0, NULL, NULL),
(1246, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:52:41', 0, NULL, NULL),
(1247, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:52:57', 0, NULL, NULL),
(1248, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:53:10', 0, NULL, NULL),
(1249, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:53:19', 0, NULL, NULL),
(1250, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:53:25', 0, NULL, NULL),
(1251, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:53:32', 0, NULL, NULL),
(1252, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:53:38', 0, NULL, NULL),
(1253, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:53:45', 0, NULL, NULL),
(1254, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:53:48', 0, NULL, NULL),
(1255, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:53:54', 0, NULL, NULL),
(1256, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:54:00', 0, NULL, NULL),
(1257, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:54:04', 0, NULL, NULL),
(1258, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:54:10', 0, NULL, NULL),
(1259, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:54:13', 0, NULL, NULL),
(1260, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:54:16', 0, NULL, NULL),
(1261, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:54:19', 0, NULL, NULL),
(1262, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:54:25', 0, NULL, NULL),
(1263, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:54:32', 0, NULL, NULL),
(1264, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:54:40', 0, NULL, NULL),
(1265, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:54:45', 0, NULL, NULL),
(1266, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:54:54', 0, NULL, NULL),
(1267, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:54:57', 0, NULL, NULL),
(1268, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:55:04', 0, NULL, NULL),
(1269, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:55:17', 0, NULL, NULL),
(1270, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:55:20', 0, NULL, NULL),
(1271, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:55:26', 0, NULL, NULL),
(1272, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:55:29', 0, NULL, NULL),
(1273, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:55:32', 0, NULL, NULL),
(1274, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:55:45', 0, NULL, NULL),
(1275, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:55:58', 0, NULL, NULL),
(1276, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:56:01', 0, NULL, NULL),
(1277, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:56:02', 0, NULL, NULL),
(1278, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:56:04', 0, NULL, NULL),
(1279, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:56:10', 0, NULL, NULL),
(1280, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:56:17', 0, NULL, NULL),
(1281, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:56:23', 0, NULL, NULL),
(1282, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:56:26', 0, NULL, NULL),
(1283, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:56:32', 0, NULL, NULL),
(1284, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:56:39', 0, NULL, NULL),
(1285, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:56:45', 0, NULL, NULL),
(1286, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:56:46', 0, NULL, NULL),
(1287, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:56:55', 0, NULL, NULL),
(1288, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:57:01', 0, NULL, NULL),
(1289, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:57:07', 0, NULL, NULL),
(1290, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:57:12', 0, NULL, NULL),
(1291, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:57:17', 0, NULL, NULL),
(1292, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:57:23', 0, NULL, NULL),
(1293, 1, 4, 'motion_detected', 'info', 'Zaznamenany pohyb v chodbe', 0, '2026-02-11 15:57:27', 0, NULL, NULL);

--
-- Spúšťače `events`
--
DELIMITER $$
CREATE TRIGGER `after_alert_event` AFTER INSERT ON `events` FOR EACH ROW BEGIN
    IF NEW.severity IN ('alert', 'critical') THEN
        INSERT INTO notifications (household_id, user_id, title, message, type)
        SELECT 
            NEW.household_id,
            hu.id,
            'Bezpečnostné upozornenie!',
            CONCAT('Udalosť: ', NEW.description),
            NEW.severity
        FROM household_users hu
        WHERE hu.household_id = NEW.household_id 
        AND hu.is_active = TRUE;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_buzzer_on_alert` AFTER INSERT ON `events` FOR EACH ROW BEGIN
  DECLARE v_alarm_active VARCHAR(10);
  
  SELECT alarm_status INTO v_alarm_active
  FROM households
  WHERE id = NEW.household_id;
  
  IF NEW.severity IN ('alert', 'critical') AND v_alarm_active = 'active' THEN
    CALL sp_activate_buzzer(NEW.household_id, NEW.id);
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `households`
--

CREATE TABLE `households` (
  `id` int NOT NULL,
  `household_key` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  `alarm_status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'inactive'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Sťahujem dáta pre tabuľku `households`
--

INSERT INTO `households` (`id`, `household_key`, `name`, `address`, `city`, `postal_code`, `owner_id`, `created_at`, `updated_at`, `is_active`, `alarm_status`) VALUES
(1, 'DOM-2024-A1B2C3', 'Rodinný dom - Kováčovci', 'Hlavná 123', 'Bratislava', '81101', 1, '2025-12-03 18:52:27', '2026-02-11 15:47:43', 1, 'inactive'),
(2, 'DOM-2024-D4E5F6', 'Apartmán - Novákovci', 'Mierová 45', 'Košice', '04001', 1, '2025-12-03 18:52:27', '2025-12-05 20:09:08', 0, 'active');

--
-- Spúšťače `households`
--
DELIMITER $$
CREATE TRIGGER `after_alarm_status_change` AFTER UPDATE ON `households` FOR EACH ROW BEGIN
    IF OLD.alarm_status != NEW.alarm_status THEN
        INSERT INTO events (household_id, event_type, severity, description)
        VALUES (
            NEW.id,
            IF(NEW.alarm_status = 'active', 'alarm_activated', 'alarm_deactivated'),
            'info',
            CONCAT('Alarm bol ', IF(NEW.alarm_status = 'active', 'aktivovaný', 'deaktivovaný'))
        );
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `household_users`
--

CREATE TABLE `household_users` (
  `id` int NOT NULL,
  `household_id` int NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('admin','editor','viewer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'viewer',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Sťahujem dáta pre tabuľku `household_users`
--

INSERT INTO `household_users` (`id`, `household_id`, `username`, `password_hash`, `full_name`, `email`, `phone`, `role`, `created_at`, `last_login`, `is_active`, `created_by`) VALUES
(1, 1, 'kovac.admin', '$2a$10$yOAtzsLtZR3DAXwheD7DUeX2VcDVgoZDZiprWGwBQ2DckKETRT3O2', 'Peter Kováč', 'peter.kovac@email.sk', '+421901111111', 'admin', '2025-12-03 18:52:28', '2026-02-11 14:36:54', 1, NULL),
(6, 1, '', '$2b$10$uXglsm427TnCdgSfTHjeA.X9scvBzCgoMCVQzekNPmHCo7YLBnWWK', '', '', '', 'admin', '2026-02-10 15:50:14', NULL, 0, 1);

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `notifications`
--

CREATE TABLE `notifications` (
  `id` int NOT NULL,
  `household_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('info','warning','alert','critical') COLLATE utf8mb4_unicode_ci DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Sťahujem dáta pre tabuľku `notifications`
--

INSERT INTO `notifications` (`id`, `household_id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `read_at`) VALUES
(64, 1, 1, 'Bezpečnostné upozornenie!', 'Udalosť: Zaznamenany pohyb v chodbe', 'alert', 0, '2026-02-11 15:22:48', NULL);

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `sensors`
--

CREATE TABLE `sensors` (
  `id` int NOT NULL,
  `household_id` int NOT NULL,
  `sensor_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('door','window','motion','temperature','smoke','water','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','inactive','triggered','error') COLLATE utf8mb4_unicode_ci DEFAULT 'inactive',
  `last_triggered` timestamp NULL DEFAULT NULL,
  `battery_level` int DEFAULT '100',
  `is_enabled` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Sťahujem dáta pre tabuľku `sensors`
--

INSERT INTO `sensors` (`id`, `household_id`, `sensor_code`, `name`, `type`, `location`, `status`, `last_triggered`, `battery_level`, `is_enabled`, `created_at`, `updated_at`) VALUES
(1, 1, 'SENS-A1-001', 'Hlavné dvere', 'door', 'Vchod', 'active', NULL, 95, 1, '2025-12-03 18:52:28', '2025-12-03 18:52:28'),
(2, 1, 'SENS-A1-002', 'Okno obývačka', 'window', 'Obývačka', 'inactive', NULL, 88, 1, '2025-12-03 18:52:28', '2025-12-03 18:52:28'),
(3, 1, 'SENS-A1-003', 'Okno spálňa', 'window', 'Spálňa', 'inactive', NULL, 92, 1, '2025-12-03 18:52:28', '2025-12-03 18:52:28'),
(4, 1, 'SENS-A1-004', 'Chodba pohyb', 'motion', 'Chodba', 'active', NULL, 85, 1, '2025-12-03 18:52:28', '2025-12-03 18:52:28');

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `system_heartbeat`
--

CREATE TABLE `system_heartbeat` (
  `id` int NOT NULL,
  `household_id` int NOT NULL,
  `device_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'ESP32',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rssi` int DEFAULT NULL,
  `last_seen` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_online` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Sťahujem dáta pre tabuľku `system_heartbeat`
--

INSERT INTO `system_heartbeat` (`id`, `household_id`, `device_type`, `ip_address`, `rssi`, `last_seen`, `is_online`) VALUES
(1, 1, 'ESP32', '192.168.0.63', -71, '2026-02-11 15:57:26', 1),
(2, 2, 'ESP32', NULL, NULL, '2026-02-06 19:38:12', 0);

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `system_settings`
--

CREATE TABLE `system_settings` (
  `id` int NOT NULL,
  `household_id` int NOT NULL,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Sťahujem dáta pre tabuľku `system_settings`
--

INSERT INTO `system_settings` (`id`, `household_id`, `setting_key`, `setting_value`, `updated_at`, `updated_by`) VALUES
(1, 1, 'notifications_enabled', 'true', '2025-12-03 18:52:28', NULL),
(2, 1, 'auto_arm_enabled', 'false', '2025-12-03 18:52:28', NULL),
(3, 1, 'auto_arm_time', '22:00', '2025-12-03 18:52:28', NULL),
(4, 1, 'sound_alerts_enabled', 'true', '2025-12-03 18:52:28', NULL),
(5, 2, 'notifications_enabled', 'true', '2025-12-03 18:52:28', NULL),
(6, 2, 'auto_arm_enabled', 'true', '2025-12-03 18:52:28', NULL),
(7, 2, 'auto_arm_time', '23:00', '2025-12-03 18:52:28', NULL);

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `user_preferences`
--

CREATE TABLE `user_preferences` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `notifications_enabled` tinyint(1) DEFAULT '1',
  `sound_alerts` tinyint(1) DEFAULT '1',
  `email_notifications` tinyint(1) DEFAULT '1',
  `notification_priority` enum('all','warnings','critical') COLLATE utf8mb4_unicode_ci DEFAULT 'all',
  `auto_acknowledge` tinyint(1) DEFAULT '0',
  `theme` enum('dark','light') COLLATE utf8mb4_unicode_ci DEFAULT 'dark',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Sťahujem dáta pre tabuľku `user_preferences`
--

INSERT INTO `user_preferences` (`id`, `user_id`, `notifications_enabled`, `sound_alerts`, `email_notifications`, `notification_priority`, `auto_acknowledge`, `theme`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, 1, 'all', 0, 'dark', '2026-02-06 19:38:12', '2026-02-06 19:38:12');

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_buzzer_events`
-- (See below for the actual view)
--
CREATE TABLE `v_buzzer_events` (
`acknowledged` tinyint(1)
,`acknowledged_at` timestamp
,`acknowledged_by` int
,`buzzer_currently_active` tinyint(1)
,`description` text
,`event_type` enum('motion_detected','door_opened','door_closed','window_opened','window_closed','alarm_triggered','alarm_activated','alarm_deactivated','sensor_error','other')
,`household_id` int
,`household_name` varchar(100)
,`id` int
,`sensor_id` int
,`sensor_name` varchar(100)
,`severity` enum('info','warning','alert','critical')
,`timestamp` timestamp
,`triggered_buzzer` tinyint(1)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_household_status`
-- (See below for the actual view)
--
CREATE TABLE `v_household_status` (
`active_sensors` bigint
,`address` varchar(255)
,`alarm_status` enum('active','inactive')
,`city` varchar(100)
,`household_key` varchar(20)
,`id` int
,`last_event_time` timestamp
,`name` varchar(100)
,`total_sensors` bigint
,`total_users` bigint
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_recent_events`
-- (See below for the actual view)
--
CREATE TABLE `v_recent_events` (
`acknowledged` tinyint(1)
,`acknowledged_at` timestamp
,`acknowledged_by` int
,`description` text
,`event_type` enum('motion_detected','door_opened','door_closed','window_opened','window_closed','alarm_triggered','alarm_activated','alarm_deactivated','sensor_error','other')
,`household_id` int
,`household_key` varchar(20)
,`household_name` varchar(100)
,`id` int
,`sensor_id` int
,`sensor_location` varchar(100)
,`sensor_name` varchar(100)
,`sensor_type` enum('door','window','motion','temperature','smoke','water','other')
,`severity` enum('info','warning','alert','critical')
,`timestamp` timestamp
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_system_status`
-- (See below for the actual view)
--
CREATE TABLE `v_system_status` (
`alarm_status` enum('active','inactive')
,`buzzer_activated_at` timestamp
,`buzzer_active` int
,`esp_last_seen` timestamp
,`esp_online` int
,`esp_signal_strength` int
,`household_id` int
,`household_name` varchar(100)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_unread_notifications`
-- (See below for the actual view)
--
CREATE TABLE `v_unread_notifications` (
`created_at` timestamp
,`household_id` int
,`household_name` varchar(100)
,`id` int
,`is_read` tinyint(1)
,`message` text
,`read_at` timestamp
,`title` varchar(255)
,`type` enum('info','warning','alert','critical')
,`user_id` int
,`username` varchar(50)
);

--
-- Kľúče pre exportované tabuľky
--

--
-- Indexy pre tabuľku `activity_log`
--
ALTER TABLE `activity_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_household_id` (`household_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_timestamp` (`timestamp`);

--
-- Indexy pre tabuľku `api_logs`
--
ALTER TABLE `api_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_household_endpoint` (`household_id`,`endpoint`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexy pre tabuľku `buzzer_status`
--
ALTER TABLE `buzzer_status`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `household_id` (`household_id`),
  ADD KEY `triggered_by_event_id` (`triggered_by_event_id`),
  ADD KEY `deactivated_by` (`deactivated_by`);

--
-- Indexy pre tabuľku `company_owners`
--
ALTER TABLE `company_owners`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_email` (`email`);

--
-- Indexy pre tabuľku `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `acknowledged_by` (`acknowledged_by`),
  ADD KEY `idx_household_id` (`household_id`),
  ADD KEY `idx_sensor_id` (`sensor_id`),
  ADD KEY `idx_timestamp` (`timestamp`),
  ADD KEY `idx_severity` (`severity`),
  ADD KEY `idx_events_recent` (`household_id`,`timestamp` DESC),
  ADD KEY `idx_triggered_buzzer` (`household_id`,`triggered_buzzer`,`timestamp`);

--
-- Indexy pre tabuľku `households`
--
ALTER TABLE `households`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `household_key` (`household_key`),
  ADD KEY `idx_household_key` (`household_key`),
  ADD KEY `idx_owner_id` (`owner_id`);

--
-- Indexy pre tabuľku `household_users`
--
ALTER TABLE `household_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_username_household` (`username`,`household_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_household_id` (`household_id`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_users_household_role` (`household_id`,`role`);

--
-- Indexy pre tabuľku `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_household_id` (`household_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_is_read` (`is_read`);

--
-- Indexy pre tabuľku `sensors`
--
ALTER TABLE `sensors`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sensor_code` (`sensor_code`),
  ADD KEY `idx_household_id` (`household_id`),
  ADD KEY `idx_sensor_code` (`sensor_code`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_sensors_status` (`household_id`,`status`);

--
-- Indexy pre tabuľku `system_heartbeat`
--
ALTER TABLE `system_heartbeat`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `household_device` (`household_id`,`device_type`);

--
-- Indexy pre tabuľku `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_setting` (`household_id`,`setting_key`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_household_id` (`household_id`);

--
-- Indexy pre tabuľku `user_preferences`
--
ALTER TABLE `user_preferences`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_user_theme` (`user_id`,`theme`);

--
-- AUTO_INCREMENT pre exportované tabuľky
--

--
-- AUTO_INCREMENT pre tabuľku `activity_log`
--
ALTER TABLE `activity_log`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT pre tabuľku `api_logs`
--
ALTER TABLE `api_logs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pre tabuľku `buzzer_status`
--
ALTER TABLE `buzzer_status`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=66;

--
-- AUTO_INCREMENT pre tabuľku `company_owners`
--
ALTER TABLE `company_owners`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pre tabuľku `events`
--
ALTER TABLE `events`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1294;

--
-- AUTO_INCREMENT pre tabuľku `households`
--
ALTER TABLE `households`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pre tabuľku `household_users`
--
ALTER TABLE `household_users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pre tabuľku `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=77;

--
-- AUTO_INCREMENT pre tabuľku `sensors`
--
ALTER TABLE `sensors`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pre tabuľku `system_heartbeat`
--
ALTER TABLE `system_heartbeat`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=712;

--
-- AUTO_INCREMENT pre tabuľku `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pre tabuľku `user_preferences`
--
ALTER TABLE `user_preferences`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

-- --------------------------------------------------------

--
-- Štruktúra pre zobrazenie `v_buzzer_events`
--
DROP TABLE IF EXISTS `v_buzzer_events`;

CREATE ALGORITHM=UNDEFINED DEFINER=`humajadam`@`%` SQL SECURITY DEFINER VIEW `v_buzzer_events`  AS SELECT `e`.`id` AS `id`, `e`.`household_id` AS `household_id`, `e`.`sensor_id` AS `sensor_id`, `e`.`event_type` AS `event_type`, `e`.`severity` AS `severity`, `e`.`description` AS `description`, `e`.`triggered_buzzer` AS `triggered_buzzer`, `e`.`timestamp` AS `timestamp`, `e`.`acknowledged` AS `acknowledged`, `e`.`acknowledged_by` AS `acknowledged_by`, `e`.`acknowledged_at` AS `acknowledged_at`, `h`.`name` AS `household_name`, `s`.`name` AS `sensor_name`, `bs`.`is_active` AS `buzzer_currently_active` FROM (((`events` `e` join `households` `h` on((`e`.`household_id` = `h`.`id`))) left join `sensors` `s` on((`e`.`sensor_id` = `s`.`id`))) left join `buzzer_status` `bs` on((`e`.`household_id` = `bs`.`household_id`))) WHERE (`e`.`triggered_buzzer` = 1) ORDER BY `e`.`timestamp` DESC ;

-- --------------------------------------------------------

--
-- Štruktúra pre zobrazenie `v_household_status`
--
DROP TABLE IF EXISTS `v_household_status`;

CREATE ALGORITHM=UNDEFINED DEFINER=`humajadam`@`%` SQL SECURITY DEFINER VIEW `v_household_status`  AS SELECT `h`.`id` AS `id`, `h`.`household_key` AS `household_key`, `h`.`name` AS `name`, `h`.`address` AS `address`, `h`.`city` AS `city`, `h`.`alarm_status` AS `alarm_status`, count(distinct `s`.`id`) AS `total_sensors`, count(distinct (case when (`s`.`status` = 'active') then `s`.`id` end)) AS `active_sensors`, count(distinct `hu`.`id`) AS `total_users`, max(`e`.`timestamp`) AS `last_event_time` FROM (((`households` `h` left join `sensors` `s` on(((`h`.`id` = `s`.`household_id`) and (`s`.`is_enabled` = true)))) left join `household_users` `hu` on(((`h`.`id` = `hu`.`household_id`) and (`hu`.`is_active` = true)))) left join `events` `e` on((`h`.`id` = `e`.`household_id`))) WHERE (`h`.`is_active` = true) GROUP BY `h`.`id` ;

-- --------------------------------------------------------

--
-- Štruktúra pre zobrazenie `v_recent_events`
--
DROP TABLE IF EXISTS `v_recent_events`;

CREATE ALGORITHM=UNDEFINED DEFINER=`humajadam`@`%` SQL SECURITY DEFINER VIEW `v_recent_events`  AS SELECT `e`.`id` AS `id`, `e`.`household_id` AS `household_id`, `e`.`sensor_id` AS `sensor_id`, `e`.`event_type` AS `event_type`, `e`.`severity` AS `severity`, `e`.`description` AS `description`, `e`.`timestamp` AS `timestamp`, `e`.`acknowledged` AS `acknowledged`, `e`.`acknowledged_by` AS `acknowledged_by`, `e`.`acknowledged_at` AS `acknowledged_at`, `h`.`name` AS `household_name`, `h`.`household_key` AS `household_key`, `s`.`name` AS `sensor_name`, `s`.`type` AS `sensor_type`, `s`.`location` AS `sensor_location` FROM ((`events` `e` join `households` `h` on((`e`.`household_id` = `h`.`id`))) left join `sensors` `s` on((`e`.`sensor_id` = `s`.`id`))) WHERE (`e`.`timestamp` >= (now() - interval 24 hour)) ORDER BY `e`.`timestamp` DESC ;

-- --------------------------------------------------------

--
-- Štruktúra pre zobrazenie `v_system_status`
--
DROP TABLE IF EXISTS `v_system_status`;

CREATE ALGORITHM=UNDEFINED DEFINER=`humajadam`@`%` SQL SECURITY DEFINER VIEW `v_system_status`  AS SELECT `h`.`id` AS `household_id`, `h`.`name` AS `household_name`, `h`.`alarm_status` AS `alarm_status`, coalesce(`sh`.`is_online`,0) AS `esp_online`, `sh`.`last_seen` AS `esp_last_seen`, `sh`.`rssi` AS `esp_signal_strength`, coalesce(`bs`.`is_active`,0) AS `buzzer_active`, `bs`.`activated_at` AS `buzzer_activated_at` FROM ((`households` `h` left join `system_heartbeat` `sh` on((`h`.`id` = `sh`.`household_id`))) left join `buzzer_status` `bs` on((`h`.`id` = `bs`.`household_id`))) WHERE (`h`.`is_active` = true) ;

-- --------------------------------------------------------

--
-- Štruktúra pre zobrazenie `v_unread_notifications`
--
DROP TABLE IF EXISTS `v_unread_notifications`;

CREATE ALGORITHM=UNDEFINED DEFINER=`humajadam`@`%` SQL SECURITY DEFINER VIEW `v_unread_notifications`  AS SELECT `n`.`id` AS `id`, `n`.`household_id` AS `household_id`, `n`.`user_id` AS `user_id`, `n`.`title` AS `title`, `n`.`message` AS `message`, `n`.`type` AS `type`, `n`.`is_read` AS `is_read`, `n`.`created_at` AS `created_at`, `n`.`read_at` AS `read_at`, `h`.`name` AS `household_name`, `hu`.`username` AS `username` FROM ((`notifications` `n` join `households` `h` on((`n`.`household_id` = `h`.`id`))) join `household_users` `hu` on((`n`.`user_id` = `hu`.`id`))) WHERE (`n`.`is_read` = false) ORDER BY `n`.`created_at` DESC ;

--
-- Obmedzenie pre exportované tabuľky
--

--
-- Obmedzenie pre tabuľku `activity_log`
--
ALTER TABLE `activity_log`
  ADD CONSTRAINT `activity_log_ibfk_1` FOREIGN KEY (`household_id`) REFERENCES `households` (`id`) ON DELETE CASCADE;

--
-- Obmedzenie pre tabuľku `buzzer_status`
--
ALTER TABLE `buzzer_status`
  ADD CONSTRAINT `buzzer_status_ibfk_1` FOREIGN KEY (`household_id`) REFERENCES `households` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `buzzer_status_ibfk_2` FOREIGN KEY (`triggered_by_event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `buzzer_status_ibfk_3` FOREIGN KEY (`deactivated_by`) REFERENCES `household_users` (`id`) ON DELETE SET NULL;

--
-- Obmedzenie pre tabuľku `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `events_ibfk_1` FOREIGN KEY (`household_id`) REFERENCES `households` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `events_ibfk_2` FOREIGN KEY (`sensor_id`) REFERENCES `sensors` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `events_ibfk_3` FOREIGN KEY (`acknowledged_by`) REFERENCES `household_users` (`id`) ON DELETE SET NULL;

--
-- Obmedzenie pre tabuľku `households`
--
ALTER TABLE `households`
  ADD CONSTRAINT `households_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `company_owners` (`id`) ON DELETE CASCADE;

--
-- Obmedzenie pre tabuľku `household_users`
--
ALTER TABLE `household_users`
  ADD CONSTRAINT `household_users_ibfk_1` FOREIGN KEY (`household_id`) REFERENCES `households` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `household_users_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `household_users` (`id`) ON DELETE SET NULL;

--
-- Obmedzenie pre tabuľku `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`household_id`) REFERENCES `households` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `household_users` (`id`) ON DELETE CASCADE;

--
-- Obmedzenie pre tabuľku `sensors`
--
ALTER TABLE `sensors`
  ADD CONSTRAINT `sensors_ibfk_1` FOREIGN KEY (`household_id`) REFERENCES `households` (`id`) ON DELETE CASCADE;

--
-- Obmedzenie pre tabuľku `system_heartbeat`
--
ALTER TABLE `system_heartbeat`
  ADD CONSTRAINT `system_heartbeat_ibfk_1` FOREIGN KEY (`household_id`) REFERENCES `households` (`id`) ON DELETE CASCADE;

--
-- Obmedzenie pre tabuľku `system_settings`
--
ALTER TABLE `system_settings`
  ADD CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`household_id`) REFERENCES `households` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `system_settings_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `household_users` (`id`) ON DELETE SET NULL;

--
-- Obmedzenie pre tabuľku `user_preferences`
--
ALTER TABLE `user_preferences`
  ADD CONSTRAINT `user_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `household_users` (`id`) ON DELETE CASCADE;

DELIMITER $$
--
-- Udalosti
--
CREATE DEFINER=`humajadam`@`%` EVENT `evt_check_system_offline` ON SCHEDULE EVERY 30 SECOND STARTS '2026-02-06 20:38:12' ON COMPLETION NOT PRESERVE ENABLE DO BEGIN
  UPDATE system_heartbeat
  SET is_online = FALSE
  WHERE last_seen < DATE_SUB(NOW(), INTERVAL 60 SECOND)
    AND is_online = TRUE;
END$$

DELIMITER ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
