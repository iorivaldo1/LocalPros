<?php
function getFirstLetter($str) {
		$char = iconv('UTF-8', 'GB18030//IGNORE', mb_substr($str, 0, 1, 'UTF-8'));
		
		$asc = ord($char[0]) * 256 + ord($char[1]) - 65536;

		return $asc;
}

echo getFirstLetter('蕨'); // 输出：Y
?>